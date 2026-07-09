async function loadGallery(){


const {data,error} = await db
.from("examples")
.select("*")
.order("created_at", {
    ascending:false
});



const gallery =
document.getElementById("gallery");



if(error){

gallery.innerHTML =
"Could not load examples.";

console.error(error);

return;

}



gallery.innerHTML = "";



if(data.length === 0){

gallery.innerHTML =
"No examples available yet.";

return;

}



data.forEach(example => {


gallery.innerHTML += `

<div class="example">


<img 
src="${example.image_url}"
alt="${example.title}"
>


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



loadGallery();
