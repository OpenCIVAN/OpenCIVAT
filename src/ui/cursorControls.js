// ----------------------------------------------------------------------------
// Cursor Controls UI
// ----------------------------------------------------------------------------

import {
  updateMyCursor,
  hideMyCursor,
  getActiveCursors,
} from "../collaboration/cursors.js";
import { getUserId, updateUserName, getUserColor } from "../collaboration/userManagement.js";
import { yUserNames } from "../collaboration/yjsSetup.js";
import { logSuccess, logInfo } from "./logging.js";

export function addCursorControls() {
  const controlTable = document.querySelector("table");

  if (!controlTable) {
    console.error('Control table not found');
    return;
  }

  // Name input row
  const nameRow = document.createElement("tr");
  const nameCell = document.createElement("td");
  const nameContainer = document.createElement("div");
  nameContainer.style.cssText = "display: flex; gap: 5px; align-items: center;";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Your name...";
  nameInput.value = localStorage.getItem("vtk-username") || "";
  nameInput.maxLength = 20;
  nameInput.style.cssText =
    "flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;";

  const nameButton = document.createElement("button");
  nameButton.textContent = "Set";
  nameButton.style.cssText =
    "background: #2196F3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;";

  nameButton.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (newName) {
      updateUserName(newName);
      nameButton.textContent = "✓";
      nameButton.style.background = "#4CAF50";
      setTimeout(() => {
        nameButton.textContent = "Set";
        nameButton.style.background = "#2196F3";
      }, 1000);
    }
  });

  nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      nameButton.click();
    }
  });

  nameContainer.appendChild(nameInput);
  nameContainer.appendChild(nameButton);
  nameCell.appendChild(nameContainer);
  nameRow.appendChild(nameCell);
  controlTable.appendChild(nameRow);

  // Cursor toggle row
  const cursorRow = document.createElement("tr");
  const cursorCell = document.createElement("td");
  const cursorContainer = document.createElement("div");
  cursorContainer.style.cssText =
    "display: flex; gap: 8px; align-items: center;";

  const cursorToggle = document.createElement("button");
  cursorToggle.textContent = "Hide My Cursor";
  cursorToggle.style.cssText =
    "flex: 1; background: #4CAF50; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;";

  let cursorVisible = true;
  cursorToggle.addEventListener("click", () => {
    cursorVisible = !cursorVisible;

    if (cursorVisible) {
      cursorToggle.textContent = "Hide My Cursor";
      cursorToggle.style.background = "#4CAF50";
      updateMyCursor();
    } else {
      cursorToggle.textContent = "Show My Cursor";
      cursorToggle.style.background = "#f44336";
      hideMyCursor();
    }
    logInfo(`Cursor visibility: ${cursorVisible ? "visible" : "hidden"}`);
  });

  const cursorCount = document.createElement("span");
  cursorCount.style.cssText =
    "font-size: 12px; color: #666; font-weight: bold;";
  cursorCount.textContent = "0 users";

  cursorContainer.appendChild(cursorToggle);
  cursorContainer.appendChild(cursorCount);
  cursorCell.appendChild(cursorContainer);
  cursorRow.appendChild(cursorCell);
  controlTable.appendChild(cursorRow);

  // User list row
  const userListRow = document.createElement("tr");
  const userListCell = document.createElement("td");
  const userListContainer = document.createElement("div");
  userListContainer.style.cssText = `
    background: #f5f5f5; padding: 8px; border-radius: 4px;
    font-size: 11px; max-height: 80px; overflow-y: auto; border: 1px solid #ddd;
  `;

  const userListTitle = document.createElement("div");
  userListTitle.textContent = "Active Users:";
  userListTitle.style.cssText = "font-weight: bold; margin-bottom: 4px;";

  const userList = document.createElement("div");
  userList.id = "active-user-list";

  userListContainer.appendChild(userListTitle);
  userListContainer.appendChild(userList);
  userListCell.appendChild(userListContainer);
  userListRow.appendChild(userListCell);
  controlTable.appendChild(userListRow);

  // Update user list periodically
  setInterval(() => {
    const activeCursors = getActiveCursors();
    const count = activeCursors.size;
    cursorCount.textContent = `${count} user${count === 1 ? "" : "s"}`;
    cursorCount.style.color = count > 0 ? "#4CAF50" : "#666";

    // Update user list
    const userListDiv = document.getElementById("active-user-list");
    if (userListDiv) {
      userListDiv.innerHTML = "";

      if (count === 0) {
        userListDiv.textContent = "No other users online";
        userListDiv.style.color = "#999";
        userListDiv.style.fontStyle = "italic";
      } else {
        userListDiv.style.fontStyle = "normal";
        activeCursors.forEach((cursor, userId) => {
          const userItem = document.createElement("div");
          const displayName =
            yUserNames.get(userId) || userId.replace("user_", "User ");
          const userColor = getUserColor(userId);

          userItem.style.cssText = `
            display: flex; align-items: center; gap: 6px;
            margin-bottom: 2px; padding: 2px 4px;
            border-radius: 3px; background: rgba(0,0,0,0.05);
          `;

          const colorDot = document.createElement("div");
          colorDot.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%;
            background: ${userColor}; border: 1px solid white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          `;

          const nameSpan = document.createElement("span");
          nameSpan.textContent = displayName;
          nameSpan.style.cssText = "color: #333;";

          userItem.appendChild(colorDot);
          userItem.appendChild(nameSpan);
          userListDiv.appendChild(userItem);
        });
      }
    }
  }, 1000);

  logSuccess("Collaborative cursor controls added");
}
