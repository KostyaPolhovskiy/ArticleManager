const objectId = require("mongodb").ObjectID;

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

function checkField(errors, fieldValue, fieldName) {
    if (fieldValue == undefined)
        errors.push({ field: `${fieldName}`, error: `${fieldName} is required` })
    if (fieldValue == "")
        errors.push({ field: `${fieldName}`, error: `${fieldName} cant be empty` })
}

function checkFieldIsNumber(errors, fieldValue, fieldName) {
    if ((!isPositiveNumeric(fieldValue) && fieldValue != undefined) || +fieldValue == 0)
        errors.push({ field: `${fieldName}`, error: `${fieldName} must be positive integer` });
}


createArticle = function(request, response) {
    const articleTitle = request.body.title;
    const articleBody = request.body.body;
    let errBody = { errors: [] };

    checkField(errBody.errors, articleTitle, "Title");
    checkField(errBody.errors, articleBody, "Body");
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
    response.status(200).send(article);
}

updateArticle = function(request, response) {
    const articleTitle = request.body.title;
    const articleBody = request.body.body;
    let errBody = { errors: [] };

    checkField(errBody.errors, articleTitle, "Title");
    checkField(errBody.errors, articleBody, "Body");
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
                response.status(200).send(updatedArticle.value);
            } else {
                let errBody = { errors: [] };
                errBody.errors.push({ field: "id", error: "Not found" });
                return response.status(422).send(errBody);
            }
        })
        .catch(err => console.log(`Failed to find and update article: ${err}`));
}

getArticle = function(request, responce) {
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
                responce.status(200).send(result);
            } else {
                errBody.errors.push({ field: "id", error: "Not found" });
                responce.status(404).send(errBody);
            }
        });
}

getArticles = function(request, response) {
    let reqPage = request.query.page;
    let reqLimit = request.query.limit;
    let errBody = { errors: [] };

    checkFieldIsNumber(errBody.errors, reqPage, "Page");
    checkFieldIsNumber(errBody.errors, reqLimit, "Limit");
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
            response.status(200).send(responce);
        });
}

module.exports = {
    createArticle,
    updateArticle,
    getArticle,
    getArticles
}