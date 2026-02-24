fetch("/trend", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scores })
})