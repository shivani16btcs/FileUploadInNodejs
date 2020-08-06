const libsvc = require("libsvc");
const Route = libsvc.Route;
const fileupload= require('../controller/upload')

const upload = new Route("post", "/upload");
module.exports = upload;


upload.setMeta({
    isPublic: true,
});
  

upload.use(fileupload.singleUpload);