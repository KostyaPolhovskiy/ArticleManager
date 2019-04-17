const express = require("express");
const articles = require("./routes/articles");
const MongoClient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const app = express();
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
let dbClient;

mongoClient.connect(function(err, client) {
    if (err) return console.log(err);
    dbClient = client;
    app.locals.collection = client.db("articlesdb").collection("articles");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/v1/articles", articles);

app.listen(8080, function() {
    console.log("Сервер ожидает подключения...");
});

// прослушиваем прерывание работы программы (ctrl-c)
process.on("SIGINT", () => {
    dbClient.close();
    process.exit();
});