const SUPABASE_URL = "DEINE_PROJECT_URL";

const SUPABASE_KEY = "DEIN_ANON_KEY";



const db = supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);





async function loadReviews(){


const {data,error}=await db
.from("reviews")
.select("*")
.order("created_at",{ascending:false});



if(error){

console.log(error);

return;

}



const box=document.getElementById("review-list");


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









document
.getElementById("review-form")
.addEventListener("submit",async(e)=>{


e.preventDefault();



const name =
document.getElementById("name").value;


const rating =
document.getElementById("rating").value;


const message =
document.getElementById("message").value;




const {error}=await db
.from("reviews")
.insert({

name:name,

rating:Number(rating),

message:message

});



if(error){

alert("Error submitting review");

console.log(error);

return;

}



alert("Thank you for your review!");

location.reload();


});
