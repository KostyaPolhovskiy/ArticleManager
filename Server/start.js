const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectID;
const bodyParser = require("body-parser");
const app = express();
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
let dbClient;


function isPositiveNumeric(value) {
    return /^\d+$/.test(value);
}

function renameField(obj, oldName, newName) {
    if (!obj.hasOwnProperty(oldName)) {
        return false;
    }
    obj[newName] = obj[oldName];
    delete obj[oldName];
    return true;
}

mongoClient.connect(function(err, client) {
    if (err) return console.log(err);
    dbClient = client;
    app.locals.collection = client.db("articlesdb").collection("articles");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.post("/v1/articles", function(request, response) {
    const articleTitle = request.body.title;
    const articleBody = request.body.body;
    let errBody = { errors: [] };

    if (articleTitle == "" || articleTitle == undefined)
        errBody.errors.push({ field: "title", error: "title is required" });
    if (articleBody == "" || articleBody == undefined)
        errBody.errors.push({ field: "body", error: "body is required" });
    if (errBody.errors.length > 0)
        return response.status(422).send(errBody);

    let d = new Date();
    let article = {
        title: articleTitle,
        body: articleBody,
        created_at: d,
        updated_at: d
    };

    const collection = request.app.locals.collection;
    collection.insertOne(article).then(result => {
        article.id = result.insertedId;
    })

    renameField(article, "_id", "id");
    response.send(article);
});

app.put("/v1/articles/:id", function(request, response) {
    const articleTitle = request.body.title;
    const articleBody = request.body.body;
    let errBody = { errors: [] };

    if (articleTitle == "" || articleTitle == undefined)
        errBody.errors.push({ field: "title", error: "title is required" });
    if (articleBody == "" || articleBody == undefined)
        errBody.errors.push({ field: "body", error: "body is required" });
    try {
        var id = new objectId(request.params.id);
    } catch {
        errBody.errors.push({ field: "id", error: "Not valid" });
    }
    if (errBody.errors.length > 0)
        return response.status(422).send(errBody);

    let d = new Date();

    const collection = request.app.locals.collection;
    collection.findOneAndUpdate({ _id: id }, { $set: { title: articleTitle, body: articleBody, updated_at: d } }, { returnOriginal: false })
        .then(updatedArticle => {
            if (updatedArticle.value) {
                console.log(`Successfully updated article: ${updatedArticle.value._id}.`);
                renameField(updatedArticle.value, "_id", "id");
                response.send(updatedArticle.value);
            } else {
                let errBody = { errors: [] };
                errBody.errors.push({ field: "id", error: "Not found" });
                return response.status(422).send(errBody);
            }
        })
        .catch(err => console.log(`Failed to find and update article: ${err}`));
});

app.get("/v1/articles/", function(request, response) {
    let reqPage = request.query.page;
    let reqLimit = request.query.limit;
    let errBody = { errors: [] };

    if ((!isPositiveNumeric(reqPage) && reqPage != undefined) || +reqPage == 0)
        errBody.errors.push({ field: "page", error: "page must be positive integer" });
    if ((!isPositiveNumeric(reqLimit) && reqLimit != undefined) || +reqLimit == 0)
        errBody.errors.push({ field: "limit", error: "limit must be positive integer" });
    if (+reqLimit > 10)
        errBody.errors.push({ field: "limit", error: "max limit = 10" })
    if (errBody.errors.length > 0)
        return response.status(422).send(errBody);

    reqPage = +reqPage || 1;
    reqLimit = +reqLimit || 10;

    const collection = request.app.locals.collection;
    let articleCount;
    collection.find().count().then((count) => {
        articleCount = count;
    });
    collection.find().sort({ created_at: -1 }).skip((reqPage - 1) * reqLimit).limit(reqLimit).toArray()
        .then(results => {
            results.forEach(article => {
                renameField(article, "_id", "id");
            });
            let responce = {
                count: articleCount,
                page: reqPage,
                limit: reqLimit,
                articles: results
            }
            response.send(responce);
        });
});

app.get("/v1/articles/:id", function(request, responce) {
    let errBody = { errors: [] };
    try {
        var id = new objectId(request.params.id);
    } catch {
        errBody.errors.push({ field: "id", error: "Not valid" });
        return responce.status(422).send(errBody);
    }
    const collection = request.app.locals.collection;
    collection.findOne({ _id: id })
        .then(result => {
            if (result) {
                renameField(result, "_id", "id");
                responce.send(result);
            } else {
                errBody.errors.push({ field: "id", error: "Not found" });
                responce.status(404).send(errBody);
            }
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