const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { execute, subscribe } = require("graphql");
const { PubSub } = require("graphql-subscriptions");
const shortid = require("shortid");
// Initalise one pubsub instance which all data is published on
const pubsub = new PubSub();

// Some fake data
let feedbacks = [
  {
    id: 1,
    feedback: "abc"
  }
];
let books = [
  {
    id: shortid.generate(),
    title: "Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams"
  },
  {
    id: shortid.generate(),
    title: "Maps of Meaning",
    author: "Jordan Peterson"
  },
  {
    id: shortid.generate(),
    title: "The Light Fantastic",
    author: "Terry Pratchett"
  }
];

// The GraphQL schema in string form
const typeDefs = `
type Feedback { id: Int!, feedback: String! }
input FeedbackInput { feedback: String! }

type Book { id: ID!, title: String!, author: String! }
input BookInput { title: String!, author: String! }

type Query {
  feedbacks: [Feedback]
  books: [Book]
}
type Mutation {
  addFeedback(data: FeedbackInput!): Feedback
  addBook(data: BookInput!): Book
}
type Subscription {
  feedbackAdded: Feedback
  bookAdded: Book
}
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
`;

const resolvers = {
  Query: {
    books: () => books,
    feedbacks: () => feedbacks
  },
  Mutation: {
    addFeedback(_, args) {
      args.data.id = feedbacks.length + 1;
      feedbacks.unshift(args.data);
      pubsub.publish("feedbackAdded", { feedbackAdded: args.data });
      return args.data;
    },
    addBook(_, args) {
      (args.data.id = shortid.generate()), books.unshift(args.data);
      pubsub.publish("bookAdded", { bookAdded: args.data });
      return args.data;
    }
  },
  Subscription: {
    feedbackAdded: {
      subscribe: () => pubsub.asyncIterator("feedbackAdded")
    },
    bookAdded: {
      subscribe: () => pubsub.asyncIterator("bookAdded")
    }
  }
};

// Put together a schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Initialize the app
const app = express();
app.use(cors());
// The GraphQL endpoint
app.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress({
    schema
  })
);

const port = 3001;
// GraphiQL, a visual editor for queries
app.use(
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/graphql",
    subscriptionsEndpoint: `ws://localhost:${port}/subscriptions`
  })
);
const server = createServer(app);
server.listen(port, () => {
  console.log(`graphiql client at http://localhost:${port}/graphiql`);
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema
    },
    { server, path: "/subscriptions" }
  );
});
