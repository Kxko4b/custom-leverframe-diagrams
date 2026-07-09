const SUPABASE_URL = "DEINE_SUPABASE_URL";
const SUPABASE_KEY = "DEIN_ANON_KEY";


const database = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);




// Reviews anzeigen

async function loadReviews(){

    const {data,error} = await database
    .from("reviews")
    .select("*")
    .order("created_at", {
        ascending:false
    });


    if(error){
        console.log(error);
        return;
    }


    const list =
    document.getElementById("review-list");


    list.innerHTML="";


    data.forEach(review=>{


        list.innerHTML += `

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





// Neue Bewertung senden

document
.getElementById("review-form")
.addEventListener(
"submit",
async function(event){


event.preventDefault();



const name =
document.getElementById("name").value;


const rating =
document.getElementById("rating").value;


const message =
document.getElementById("message").value;



const {error} =
await database
.from("reviews")
.insert({

name:name,

rating:Number(rating),

message:message

});



if(error){

alert("Something went wrong");

console.log(error);

return;

}



alert("Thanks for your review!");



location.reload();



});
