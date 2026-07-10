const ADMIN_EMAIL = "haleannson@gmail.com";



const loginBox =
document.getElementById("login-box");

const dashboard =
document.getElementById("dashboard");





async function checkUser(){


const {data} =
await db.auth.getUser();



if(
data.user &&
data.user.email === ADMIN_EMAIL
){

showDashboard();

}


}



function showDashboard(){


loginBox.style.display="none";

dashboard.style.display="block";

loadAdminExamples();

}






document
.getElementById("login-button")
.onclick = async()=>{


const email =
document.getElementById("email").value;


const password =
document.getElementById("password").value;



const {error} =
await db.auth.signInWithPassword({

email,
password

});



if(error){

alert(error.message);

return;

}


checkUser();


};








async function uploadExample(){


const file =
document.getElementById("image")
.files[0];



if(!file){

alert("Choose an image");

return;

}



const filename =
"examples/" +
Date.now() +
"-" +
file.name;




const upload =
await db.storage
.from("diagram-files")
.upload(
filename,
file
);



if(upload.error){

alert(upload.error.message);

return;

}



const url =
db.storage
.from("diagram-files")
.getPublicUrl(filename)
.data
.publicUrl;




await db
.from("examples")
.insert({

title:
document.getElementById("title").value,


description:
document.getElementById("description").value,


image_url:url

});



alert("Uploaded!");

location.reload();


}




document
.getElementById("upload-button")
.onclick =
uploadExample;





document
.getElementById("logout-button")
.onclick =
async()=>{


await db.auth.signOut();

location.reload();

};




checkUser();
