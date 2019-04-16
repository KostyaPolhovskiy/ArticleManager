const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectID;
const bodyParser = require("body-parser");
const app = express();
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
let dbClient;

mongoClient.connect(function(err, client) {
    if (err) return console.log(err);
    dbClient = client;
    app.locals.collection = client.db("articlesdb").collection("articles");
});

app.use(bodyParser.json()); // <--- Here
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/v1/articles", function(req, res) {
    const articleTitle = req.body.title;
    const articleBody = req.body.body;
    let d = new Date();
    let article = {
        title: articleTitle,
        body: articleBody,
        created_at: d,
        updated_at: d
    };

    const collection = req.app.locals.collection; //?
    collection.insertOne(article, function(err, resArticleOk) {
        if (err) return console.log(err);
        collection.findOne(article, function(err, resArticle) {
            if (err) return console.log(err);
            res.send(resArticle);
        });
    });

});

app.put("/v1/articles/:id", function(req, res) {
    const id = new objectId(req.params.id);
    const articleTitle = req.body.title;
    const articleBody = req.body.body;
    let d = new Date();

    const collection = req.app.locals.collection;
    collection.findOneAndUpdate({ _id: id }, { $set: { title: articleTitle, body: articleBody, updated_at: d } }, { returnOriginal: false }, function(err, result) {
        if (err) return console.log(err);
        res.send(result.value);
    });
});

app.get("/v1/articles/", function(req, res) {
    const reqPage = +req.query.page || 1;
    const reqLimit = +req.query.limit || 10;

    const collection = req.app.locals.collection;
    let reqCount;
    collection.find().count().then((count) => {
        reqCount = count;
    });
    collection.find().sort({ created_at: -1 }).skip((reqPage - 1) * reqLimit).limit(reqLimit).toArray(function(err, results) {
        if (err) return console.log(err);
        let responce = {
            count: reqCount,
            page: reqPage,
            limit: reqLimit,
            articles: results
        }
        res.send(responce);
    });;
});

app.get("/v1/articles/:id", function(req, res) {
    const id = new objectId(req.params.id);
    const collection = req.app.locals.collection;
    collection.findOne({ _id: id }, function(err, result) {
        if (err) return console.log(err);
        res.send(result);
    });
});

app.listen(8080, function() {
    console.log("Сервер ожидает подключения...");
});

// прослушиваем прерывание работы программы (ctrl-c)
process.on("SIGINT", () => {
    dbClient.close();
    process.exit();
});