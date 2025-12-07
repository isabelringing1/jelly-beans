import { useState, useEffect } from "react";
import TextContainer from "./TextContainer.jsx";
import Categories from "./Categories.jsx";
import ContainerLabels from "./ContainerLabels.jsx";
import { initializeLifeTables } from "./util/TimeCalculator.js";
import flower from "/flower.png";

const App = () => {
  const [userParams, setUserParams] = useState({});
  const [showCategories, setShowCategories] = useState(false);
  const [wildcardCategory, setWildcardCategory] = useState("gaming");
  const [days, setDays] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    loadData();
    fetch("./life_tables.csv")
      .then((response) => response.text())
      .then((lifeTables) => {
        initializeLifeTables(lifeTables);
      });
    document.addEventListener("three-loaded", () => {
      setLoaded(true);
    });
    setTimeout(() => {
      setShowWarning(true);
    }, 3000);
  }, []);

  useEffect(() => {
    if (days > 0) {
      saveData();
    }
  }, [days]);

  function saveData() {
    var newPlayerData = { days: days };
    var saveString = JSON.stringify(newPlayerData);
    localStorage.setItem("jelly-beans", window.btoa(saveString));
  }

  function loadData() {
    var saveData = localStorage.getItem("jelly-beans");
    if (saveData != null) {
      try {
        saveData = JSON.parse(window.atob(saveData));
        document.dispatchEvent(
          new CustomEvent("data-loaded", {
            detail: { days: saveData.days },
          })
        );
      } catch (e) {
        return null;
      }
      return saveData;
    }
    return null;
  }

  return (
    <div id="content">
      <div
        className="isabisabel"
        onClick={() => {
          window.open("https://isabisabel.com", "_blank").focus();
        }}
      >
        isabisabel
        <img className="flower" src={flower} />
      </div>
      <TextContainer
        userParams={userParams}
        setUserParams={setUserParams}
        setShowCategories={setShowCategories}
        days={days}
        setDays={setDays}
        loaded={loaded}
        showWarning={showWarning}
      />
      <ContainerLabels wildcardCategory={wildcardCategory} />
      <Categories
        show={showCategories}
        setWildcardCategory={setWildcardCategory}
      />
      {showWarning && (
        <div className="warning-container">
          <div className="warning">
            <div className="warning-title">Not seeing anything?</div>
            <div className="warning-text">
              Your browser may not support WebGPU yet.
            </div>
            <div className="warning-text">
              Please switch or update your browser to play.
            </div>
            <div className="warning-text">
              (Refreshing the page may also help.)
            </div>
            <div className="warning-text">
              <a
                href="https://web.dev/blog/webgpu-supported-major-browsers"
                target="_blank"
              >
                Read More
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
