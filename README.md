### Purpose

Demonstrate the simplest possible example of an apollo subscription

## To use

```bash
npm i
node .
```

open [http://localhost:3000/graphiql] in two windows
in the first paste the following subscription and run it

```js
subscription s{
  feedbackAdded {
    id
    text
  }
}
```

You should see "Your subscription data will appear here after server publication!"

In the second window run the following

```js
mutation m {
  addFeedback(data:{text:"thanks for making this awesome example"}) {
    id
  }
}
```