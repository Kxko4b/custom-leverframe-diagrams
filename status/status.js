document
.getElementById("check-button")
.onclick = async()=>{


const input =
document
.getElementById("request-id")
.value
.trim();



const number =
input.replace("KXD-","");



if(!number){

alert("Enter a request ID.");

return;

}




const {data,error} =
await db
.from("requests")
.select("*")
.eq("id",Number(number))
.single();





const result =
document.getElementById("result");




if(error || !data){


result.innerHTML = `

<h3>
Request not found
</h3>

<p>
Please check your request ID.
</p>

`;

return;


}





result.innerHTML = `

<div class="request-card">


<h2>
KXD-${String(data.id).padStart(4,"0")}
</h2>


<p>
<strong>Status:</strong>
${data.status}
</p>


<p>
<strong>Type:</strong>
${data.type}
</p>


<p>
<strong>Size:</strong>
${data.size}
</p>


<p>
<strong>Submitted:</strong>
${new Date(data.created_at).toLocaleDateString()}
</p>


</div>

`;


};
