var resetButton = document.getElementById("pncTopResetButton");
var autoSetupButton = document.createElement("div");
autoSetupButton.className = "pncTopButton pncTopButtonText";
autoSetupButton.style = "margin-left: 6px";
autoSetupButton.textContent = "Auto";
autoSetupButton.onclick = function() {
    alert("Hello World!");
}
resetButton.parentNode.insertBefore(autoSetupButton, resetButton);