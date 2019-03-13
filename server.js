var express = require("express");
var exphbs = require("express-handlebars");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var app = express();
var PORT = process.env.PORT || 3000;




// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(logger("dev"));




// Handlebars
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main"
    })
);
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoNpr";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });


app.get("/", function (req, res) {
    db.Article.find({ saved: false }).then(function (articles) {
        res.render("index", {
            articles: articles
        });

    }).catch(err => res.json(err));
})

app.get("/saved", function (req, res) {
    db.Article.find({ saved: true }).then(function (articles) {
        res.render("saved", {
            articles: articles
        });

    }).catch(err => res.json(err));
});

app.get("/articles/:id", function (req, res) {
    db.Article.findOne({ _id: req.params.id }).then(data => res.json(data)).catch(err => res.json(err));
});

app.post("/articlenote/:id", function (req, res) {

    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {
                $push: {
                    note: dbNote._id
                }
            }, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });

});

app.delete("/deletenote/:id", function(req, res){
    db.Note.deleteOne({_id: req.params.id}).then(data => res.json(data)).catch(err => res.json(err));
})

app.get("/notes/:id", function (req, res) {
    db.Article.findOne({ _id: req.params.id }).populate("note").then(function (art) {
        res.json(art);
    }).catch(err => res.json(err));

});

app.delete("/savedarticle/:id", function (req, res) {
    db.Article.deleteOne({ _id: req.params.id }).then(data => res.json(data)).catch(err => res.json(err));
})

app.get("/scrape", function (req, res) {
    db.Article.deleteMany({}).then(function (data) {
        res.json(data);
    }).catch(err => res.json(err));

    db.Note.deleteMany({}).then(function (data) {
        res.json(data);
    }).catch(err => res.json(err));
    // First, we grab the body of the html with axios
    axios.get("https://www.npr.org/sections/news/").then(function (response) {

        // Load the Response into cheerio and save it to a variable
        // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'

        var $ = cheerio.load(response.data);

        // An empty array to save the data that we'll scrape


        // With cheerio, find each p-tag with the "title" class
        // (i: iterator. element: the current element)
        $("article.has-image").each(function (i, element) {

            var result = {};

            // Save the text of the element in a "title" variable
            result.link = $(element).find("div.item-info").find("h2.title").find('a').attr("href");

            // In the currently selected element, look at its child elements (i.e., its a-tags),
            // then save the values for any "href" attributes that the child elements may have
            result.image = $(element).find("div.imagewrap").find("a").find("img").attr("src");

            result.title = $(element).find("div.item-info").find("h2.title").find('a').text();
            result.category = $(element).find("div.item-info").find("h3.slug").find("a").text();
            result.summary = $(element).find("div.item-info").find("p.teaser").find("a").text();

            // Save these results in an object that we'll push into the results array we defined earlier
            db.Article.create(result).then(function (dbArticle) {

            }).catch(err => console.log(err));
        });



    });
    res.send("Scrape Complete");
});

app.delete("/articles", function (req, res) {
    db.Article.deleteMany({}).then(function (data) {
        res.json(data);
    }).catch(err => res.json(err));
});

app.put("/articles/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { $set: req.body }).then(data => res.json(data)).catch(err => res.json(err));
});





// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});