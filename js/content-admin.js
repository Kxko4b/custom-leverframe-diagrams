async function loadAdminContent(){


    const {data,error} =
    await db
    .from("site_content")
    .select("*");



    if(error){

        console.error(error);
        return;

    }



    data.forEach(item=>{


        if(item.section === "about"){

            document
            .getElementById("about-editor")
            .value = item.content;

        }



        if(item.section === "terms"){

            document
            .getElementById("terms-editor")
            .value = item.content;

        }


    });


}





document
.getElementById("save-content")
.onclick = async()=>{


    const about =
    document
    .getElementById("about-editor")
    .value;



    const terms =
    document
    .getElementById("terms-editor")
    .value;




