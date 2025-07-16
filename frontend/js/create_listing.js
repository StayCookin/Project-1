import "../js/firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated and is a landlord
  firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    // Optionally, check role in Firestore
    const userDoc = await firebase
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get();
    if (!userDoc.exists || userDoc.data().role !== "landlord") {
      alert("Only landlords can add properties.");
      window.location.href = "index.html";
      return;
    }

    // Handle form submission
    const form = document.querySelector("form");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Collect form data
      const propertyName = form.elements["propertyName"].value.trim();
      const rentPrice = form.elements["rentPrice"].value.trim();
      const securityFee = form.elements["securityFee"].value.trim();
      const amenitiesSelect = form.elements["amenities"];
      const propertyLocation = form.elements["propertyLocation"].value;
      const imageFile = form.elements["propertyImage"]
        ? form.elements["propertyImage"].files[0]
        : null;

      // Support multiple amenities (if select is multiple or checkboxes)
      let amenities = [];
      if (amenitiesSelect && amenitiesSelect.selectedOptions) {
        amenities = Array.from(amenitiesSelect.selectedOptions).map((opt) => ({
          name: opt.value,
          icon: opt.value.toLowerCase(),
        }));
      } else if (amenitiesSelect && amenitiesSelect.value) {
        amenities = [
          {
            name: amenitiesSelect.value,
            icon: amenitiesSelect.value.toLowerCase(),
          },
        ];
      }

      if (
        !propertyName ||
        !rentPrice ||
        !securityFee ||
        !amenities.length ||
        !propertyLocation
      ) {
        alert("Please fill in all fields.");
        return;
      }

      let imageUrl = "";
      if (imageFile) {
        try {
          const storageRef = firebase.storage().ref();
          const fileRef = storageRef.child(
            `property-images/${user.uid}_${Date.now()}_${imageFile.name}`
          );
          await fileRef.put(imageFile);
          imageUrl = await fileRef.getDownloadURL();
        } catch (err) {
          alert("Image upload failed. Please try again.");
          return;
        }
      }

      // Add property to Firestore
      try {
        await firebase
          .firestore()
          .collection("properties")
          .add({
            title: propertyName,
            price: Number(rentPrice),
            securityFee: Number(securityFee),
            amenities: amenities,
            location: propertyLocation,
            imageUrl: imageUrl,
            landlordId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        alert("Property added successfully!");
        form.reset();
      } catch (err) {
        alert("Failed to add property. Please try again.");
        console.error(err);
      }
    });
  });
});
