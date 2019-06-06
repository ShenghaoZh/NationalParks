const express    = require("express"),
      router     = express.Router({ mergeParams: true }),
      NationalPark = require("../models/nationalPark"),
      Comment    = require("../models/comment"),
      middleware = require("../middleware");

// comments Create
router.post("/", middleware.isLoggedIn, (req, res) => {
//lookup nationalPark using id
  NationalPark.findById(req.params.id, (err, np) => {
    if (err) { 
      console.log(err);
      res.redirect("/nationalParks");
    }
    else {
      //create new comment
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash("error", "Something went wrong.");
          console.log(err);
        } else {
          //add username and id to comments
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          //save comment
          comment.save();
          //connect new comment to nationalPark
//        nationalPark.comments.push(comment);
          np.comments.push(comment._id);
//        np.comments.push(comment);
//nationalPark.comments.push(comment._id);
          np.save();
//comment=={},since different type and fail save? we can not push(comment) directly.
//        console.log("C:"+comment);
//        console.log("N:"+np);
//        NationalPark.findById(req.params.id, (err, a) => {
//          console.log("F:"+a);
//          console.log("F.C"+a.comments[0]);
//        });
	  //redirect to nationalPark show page
          req.flash("success", "Successfully added comment");
          res.redirect("/nationalParks/" + np._id);
        }
      });
    }
  });
});
// commnet Update
router.put("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {
    if (err) { res.redirect("back"); }
    else { res.redirect("/nationalParks/" + req.params.id); }
  });
});
// comment Destroy
router.delete("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  //findByIdAndRemove
  Comment.findByIdAndRemove(req.params.comment_id, err => {
    if (err) { res.redirect("back"); }
    else {
      req.flash("success", "Comment deleted");
      res.redirect("/nationalParks/" + req.params.id);
    }
  });
});

module.exports = router;
