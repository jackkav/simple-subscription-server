const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { execute, subscribe } = require("graphql");
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
// Some fake data
let feedbacks = [
  {
    id: 1,
    text: "text"
  }
];
let books = [
  {
    title: "Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams"
  },
  {
    title: "Maps of Meaning",
    author: "Jordan Peterson"
  },
  {
    title: "The Light Fantastic",
    author: "Terry Pratchett"
  }
];
// The GraphQL schema in string form
const typeDefs = `
type Feedback { id: Int!, text: String! }
input FeedbackInput { text: String! }

type Book { title: String!, author: String! }
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

// The resolvers
const resolvers = {
  Query: {
    books: () => books,
    feedbacks: () => feedbacks,
  },
  Mutation: {
    addFeedback(_, args) {
      let data = args.data;
      let object = {
        id: feedbacks.length + 1,
        text: data.text
      };
      feedbacks.unshift(object);
      pubsub.publish("feedbackAdded", { feedbackAdded: object });
      return object;
    },
    addBook(_, args) {
      books.unshift(args.data);
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

// The GraphQL endpoint
app.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress({
    schema
  })
);

// GraphiQL, a visual editor for queries
app.use(
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/graphql",
    subscriptionsEndpoint: `ws://localhost:3000/subscriptions`
  })
);

const server = createServer(app);
server.listen(3000, () => {
  console.log(`server now listening at :3000`);
  new SubscriptionServer(
    {
      onConnect: connectionParams =>
        console.log("client subscription connected!", connectionParams),
      onDisconnect: () => console.log("client subscription disconnected!"),
      execute,
      subscribe,
      schema
    },
    { server, path: "/subscriptions" }
  );
});
