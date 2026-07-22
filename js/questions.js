console.log("questions.js loaded");


const questionForm =
document.getElementById("question-form");


if(questionForm){


questionForm.addEventListener("submit", async(event)=>{


event.preventDefault();


const question =
document.getElementById("question").value;


const contact =
document.getElementById("contact").value;



const {error} =
await db
.from("questions")
.insert({

    question: question,
    contact: contact

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
