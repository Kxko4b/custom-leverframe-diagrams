const SUPABASE_URL = "https://ggewdpazpeoielbqrcgm.supabase.co";

const SUPABASE_KEY = "sb_publishable_RZYBKLqjC9UYLNdqlOKZCA_IFX-5Gvm";


const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// Load reviews

async function loadReviews(){

    const { data, error } = await db
        .from("reviews")
        .select("*")
        .order("created_at", { ascending:false });


    if(error){
        console.error(error);
        return;
    }


    const box = document.getElementById("review-list");

    box.innerHTML = "";


    data.forEach(review => {

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




// Submit review

document
.getElementById("review-form")
.addEventListener("submit", async (event)=>{


event.preventDefault();


const name =
document.getElementById("name").value;


const rating =
document.getElementById("rating").value;


const message =
document.getElementById("message").value;



const {error} = await db
.from("reviews")
.insert({

name:name,
rating:Number(rating),
message:message

});



if(error){

console.error(error);

alert("Error saving review");

return;

}



alert("Review submitted!");

location.reload();


});
