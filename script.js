console.log("Main script loaded");


const SUPABASE_URL = "https://ggewdpazpeoielbqrcgm.supabase.co";
const SUPABASE_KEY = "sb_publishable_RZYBKLqjC9UYLNdqlOKZCA_IFX-5Gvm";


const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


const ADMIN_EMAIL = "haleannson@gmail.com";


// LOGIN

const loginButton = document.getElementById("login-button");

if(loginButton){

    loginButton.onclick = async()=>{

        let email = prompt("Email:");
        let password = prompt("Password:");

        const {error} = await db.auth.signInWithPassword({
            email,
            password
        });


        if(error){

            alert(error.message);
            return;

        }


        checkAdmin();

    };

}



async function checkAdmin(){

    const {data} = await db.auth.getUser();


    if(!data.user)
        return;


    if(data.user.email === ADMIN_EMAIL){

        const uploadArea =
        document.getElementById("upload-area");


        if(uploadArea)
            uploadArea.style.display="block";

    }

}




// LOAD EXAMPLES

async function loadExamples(){

    const {data,error} = await db
    .from("examples")
    .select("*")
    .order("created_at");


    if(error){

        console.error(error);
        return;

    }


    const gallery =
    document.getElementById("gallery");


    if(!gallery)
        return;


    gallery.innerHTML="";


    data.forEach(example=>{


        gallery.innerHTML += `

        <div class="example">

            <img src="${example.image_url}">

            <h3>
            ${example.title}
            </h3>

            <p>
            ${example.description ?? ""}
            </p>

        </div>

        `;


    });


}


loadExamples();
checkAdmin();




// UPLOAD

const uploadButton =
document.getElementById("upload-button");


if(uploadButton){


uploadButton.onclick = async()=>{


    const file =
    document.getElementById("diagram-image").files[0];


    if(!file)
        return;



    const filename =
    Date.now()+"-"+file.name;



    const upload =
    await db.storage
    .from("diagram-images")
    .upload(filename,file);



    if(upload.error){

        alert(upload.error.message);
        return;

    }



    const url =
    db.storage
    .from("diagram-images")
    .getPublicUrl(filename)
    .data
    .publicUrl;



    await db
    .from("examples")
    .insert({

        title:
        document.getElementById("diagram-title").value,

        description:
        document.getElementById("diagram-description").value,

        image_url:url

    });



    alert("Uploaded!");

    location.reload();


};


}




// LOAD REVIEWS


async function loadReviews(){


    const {data,error} =
    await db
    .from("reviews")
    .select("*")
    .order("created_at",{ascending:false});



    if(error){

        console.error(error);
        return;

    }



    const box =
    document.getElementById("review-list");


    if(!box)
        return;



    box.innerHTML="";



    data.forEach(review=>{


        box.innerHTML += `

        <div class="review">

            <div class="stars">

            ${"★".repeat(review.rating)}
            ${"☆".repeat(5-review.rating)}

            </div>


            <p>
            "${review.message}"
            </p>


            <strong>
            - ${review.name}
            </strong>


        </div>

        `;


    });


}


loadReviews();




// SUBMIT REVIEW


const reviewForm =
document.getElementById("review-form");


if(reviewForm){


reviewForm.addEventListener("submit",async(event)=>{


    event.preventDefault();



    const name =
    document.getElementById("review-name").value;


    const rating =
    document.getElementById("review-rating").value;


    const message =
    document.getElementById("review-message").value;



    const {error} =
    await db
    .from("reviews")
    .insert({

        name,
        rating:Number(rating),
        message

    });



    if(error){

        console.error(error);
        alert("Error saving review");
        return;

    }



    alert("Review submitted!");

    location.reload();


});


}





// SUBMIT QUESTION


const questionForm =
document.getElementById("question-form");


if(questionForm){


questionForm.addEventListener("submit",async(event)=>{


    event.preventDefault();



    const question =
    document.getElementById("question").value;


    const contact =
    document.getElementById("contact").value;



    const {error} =
    await db
    .from("questions")
    .insert({

        question,
        contact

    });



    if(error){

        console.error(error);
        alert(error.message);
        return;

    }



    alert("Question submitted! I will answer as soon as possible.");


    questionForm.reset();


});


}
