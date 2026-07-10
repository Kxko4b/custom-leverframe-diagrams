<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Kxko Admin Dashboard</title>

<link rel="stylesheet" href="../style.css">

</head>


<body>


<section>

<h1>
Kxko Admin Dashboard
</h1>



<div id="login-box">


<h2>
Login
</h2>


<input
id="admin-email"
placeholder="Email"
>


<input
id="admin-password"
type="password"
placeholder="Password"
>



<button id="login-button">
Login
</button>


</div>





<div id="dashboard" style="display:none;">


<h2>
Upload Example
</h2>



<input
id="example-title"
placeholder="Title"
>


<textarea
id="example-description"
placeholder="Description">
</textarea>



<input
id="example-image"
type="file"
accept="image/*"
>



<button id="upload-example">
Upload
</button>




<h2>
Existing Examples
</h2>



<div id="admin-gallery">

</div>




<button id="logout">
Logout
</button>


</div>


</section>




<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="../js/supabase.js"></script>
<script src="../js/admin.js"></script>


</body>

</html>
