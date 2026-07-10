const ADMIN_EMAIL = "haleannson@gmail.com";


const loginBox =
document.getElementById("login-box");

const dashboard =
document.getElementById("dashboard");



async function checkSession() {


    const { data } =
        await db.auth.getUser();



    if (
        data.user &&
        data.user.email === ADMIN_EMAIL
    ) {

        showDashboard();

    }

}





function showDashboard() {


    loginBox.style.display = "none";

    dashboard.style.display = "block";


    loadAdminExamples();


    if(typeof loadRequests === "function"){

        loadRequests();

    }


}







document
.getElementById("login-button")
.onclick = async () => {


    const email =
        document.getElementById("admin-email").value;


    const password =
        document.getElementById("admin-password").value;



    const { error } =
        await db.auth.signInWithPassword({

            email,
            password

        });



    if(error){

        alert(error.message);

        return;

    }



    checkSession();


};








async function loadAdminExamples(){


    const box =
        document.getElementById("admin-gallery");



    const { data, error } =
        await db
        .from("examples")
        .select("*")
        .order("created_at", {
            ascending:false
        });



    if(error){

        console.error(error);

        return;

    }



    box.innerHTML = "";



    data.forEach(example => {


        box.innerHTML += `


        <div class="example">


            <img
            src="${example.image_url}"
            width="250"
            >


            <h3>
            ${example.title}
            </h3>


            <button onclick="deleteExample(${example.id})">
            Delete
            </button>


        </div>


        `;


    });


}








document
.getElementById("upload-example")
.onclick = async () => {



    const file =
    document
    .getElementById("example-image")
    .files[0];



    if(!file){

        alert("Please select an image.");

        return;

    }




    const path =
    "examples/" +
    Date.now() +
    "-" +
    file.name;





    const { error: uploadError } =
    await db.storage
    .from("diagram-files")
    .upload(
        path,
        file
    );



    if(uploadError){

        alert(uploadError.message);

        return;

    }




    const imageUrl =
    db.storage
    .from("diagram-files")
    .getPublicUrl(path)
    .data
    .publicUrl;






    const { error } =
    await db
    .from("examples")
    .insert({

        title:
        document
        .getElementById("example-title")
        .value,


        description:
        document
        .getElementById("example-description")
        .value,


        image_url:imageUrl

    });




    if(error){

        alert(error.message);

        return;

    }



    alert("Uploaded!");

    loadAdminExamples();


};









async function deleteExample(id){


    if(!confirm("Delete this example?"))
        return;



    const {error} =
    await db
    .from("examples")
    .delete()
    .eq("id",id);



    if(error){

        alert(error.message);

        return;

    }



    loadAdminExamples();


}









document
.getElementById("logout")
.onclick = async()=>{


    await db.auth.signOut();

    location.reload();


};





checkSession();
