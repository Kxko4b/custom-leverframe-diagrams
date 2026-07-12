console.log("content.js loaded");


async function loadContent() {

    const { data, error } = await db
        .from("site_content")
        .select("*");


    if (error) {
        console.error("Content error:", error);
        return;
    }


    console.log("Loaded content:", data);


    data.forEach(item => {

        const text = marked.parse(item.content || "");


        if (item.section === "about") {

            const about = document.getElementById("about-text");

            if (about) {
                about.innerHTML = text;
            }

        }


        if (item.section === "terms") {

            const terms = document.getElementById("terms-text");

            if (terms) {
                terms.innerHTML = text;
            }

        }

    });
// Your Supabase setup should already be above this

async function trackVisit() {
  const { error } = await db
    .from("page_views")
    .insert([
      {
        page: window.location.pathname
      }
    ]);

  if (error) {
    console.error("View tracking error:", error);
  }
}

trackVisit();
}


loadContent();
