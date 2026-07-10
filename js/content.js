```javascript
console.log("content.js loaded");


async function loadContent() {

    const { data, error } = await db
        .from("content")
        .select("*");


    if (error) {

        console.error("Content error:", error);

        return;

    }


    console.log("Loaded content:", data);


    data.forEach(item => {

        const text = (item.content || "")
            .replace(/\n/g, "<br>");


        if (item.id === "about") {

            const aboutText =
                document.getElementById("about-text");

            if (aboutText) {

                aboutText.innerHTML = text;

            }

        }


        if (item.id === "terms") {

            const termsText =
                document.getElementById("terms-text");

            if (termsText) {

                termsText.innerHTML = text;

            }

        }

    });

}


loadContent();
```
