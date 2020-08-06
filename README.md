# file-upload-api-in-nodejs
using multer

Run the server:
 install dependencies and use "npm run dev"
 
 Test the api:
1)  test using login API (localhost:8080/login) POST with JSON body email "admin@stallion.ai" and password "admin"
like:
{
    "email":"admin@stallion.ai",
    "password":"admin"
}

2) test Upload Api( localhost:8080/upload ) POST with form-data
where key is "File"  and value is uploaded file

if everything went fine, it will send sucess response 
