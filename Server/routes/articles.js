const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articles')

// define add new article
router.post("", articlesController.createArticle);

//define update article
router.put("/:id", articlesController.updateArticle);

//define get one article by id
router.get("/:id", articlesController.getArticle);

//define get articles by pages & limits
router.get("/", articlesController.getArticles);

module.exports = router;