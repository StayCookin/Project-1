// frontend/app.js (update handleStudentSignup and handleLandlordSignup)
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001';

async function handleStudentSignup(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!validateEmail(data.email)) {
    displayMessage("Please enter a valid email address.", "error");
    return;
  }
  if (!data.username || data.username.trim() === "") {
    displayMessage("Please enter a username.", "error");
    return;
  }
  if (!data.password || data.password.length < 6) {
    displayMessage("Password must be at least 6 characters long.", "error");
    return;
  }
  if (data.password !== data.confirmPassword) {
    displayMessage("Passwords do not match.", "error");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await setDoc(doc(db, 'users', user.uid), {
      email: data.email,
      username: data.username,
      role: 'student',
      createdAt: new Date().toISOString()
    });
    const idToken = await user.getIdToken();
    await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ email: data.email, username: data.username })
    });
    displayMessage("Student account created successfully! Check your email.", "success");
    form.reset();
    document.getElementById("student-signup-modal").style.display = "none";
    window.location.href = "/student-dashboard";
  } catch (error) {
    console.error("Error during student signup:", error);
    displayMessage(error.message || "An unexpected error occurred.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}

async function handleLandlordSignup(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!validateEmail(data.email)) {
    displayMessage("Please enter a valid email address.", "error");
    return;
  }
  if (!validatePhone(data.phone)) {
    displayMessage("Please enter a valid Botswana phone number (e.g., +26771234567).", "error");
    return;
  }
  if (!data.username || data.username.trim() === "") {
    displayMessage("Please enter a username.", "error");
    return;
  }
  if (!data.password || data.password.length < 6) {
    displayMessage("Password must be at least 6 characters long.", "error");
    return;
  }
  if (data.password !== data.confirmPassword) {
    displayMessage("Passwords do not match.", "error");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Registering...";
  displayMessage("Registering your account...", "info");

  try {
    const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await setDoc(doc(db, 'users', user.uid), {
      email: data.email,
      username: data.username,
      phone: data.phone,
      role: 'landlord',
      createdAt: new Date().toISOString()
    });
    const idToken = await user.getIdToken();
    await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ email: data.email, username: data.username })
    });
    displayMessage("Landlord account created successfully! Check your email.", "success");
    form.reset();
    document.getElementById("landlord-signup-modal").style.display = "none";
    window.location.href = "/landlord-dashboard";
  } catch (error) {
    console.error("Error during landlord signup:", error);
    displayMessage(error.message || "An unexpected error occurred.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
}