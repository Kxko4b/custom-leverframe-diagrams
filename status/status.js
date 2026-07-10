document
.getElementById("check-button")
.onclick = async () => {


    const input =
        document
        .getElementById("request-id")
        .value
        .trim()
        .toUpperCase();



    const result =
        document.getElementById("result");



    if (!input) {

        alert("Enter your request code.");

        return;

    }




    const { data, error } =
        await db
        .from("requests")
        .select("*")
        .eq("request_code", input)
        .single();





    if (error || !data) {


        result.innerHTML = `

        <div class="request-card">

            <h3>
            Request not found
            </h3>

            <p>
            Please check your code and try again.
            </p>

        </div>

        `;


        return;

    }







    result.innerHTML = `

    <div class="request-card">


        <h2>
        ${data.request_code}
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
        ${new Date(data.created_at)
        .toLocaleDateString()}
        </p>


    </div>

    `;


};
