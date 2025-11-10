import { useState, useEffect } from "react";
import TextContainer from "./TextContainer.jsx";
import Categories from "./Categories.jsx";
import ContainerLabels from "./ContainerLabels.jsx";
import { initializeLifeTables } from "./util/TimeCalculator.js";

const App = () => {
  const [userParams, setUserParams] = useState({});
  const [showCategories, setShowCategories] = useState(false);
  const [wildcardCategory, setWildcardCategory] = useState("gaming");
  const [days, setDays] = useState(0);

  useEffect(() => {
    loadData();
    fetch("./life_tables.csv")
      .then((response) => response.text())
      .then((lifeTables) => {
        initializeLifeTables(lifeTables);
      });
  }, []);

  useEffect(() => {
    if (days > 0) {
      saveData();
    }
  }, [days]);

  function saveData() {
    console.log("Saving total days " + days);
    var newPlayerData = { days: days };
    var saveString = JSON.stringify(newPlayerData);
    localStorage.setItem("jelly-beans", window.btoa(saveString));
  }

  function loadData() {
    var saveData = localStorage.getItem("jelly-beans");
    if (saveData != null) {
      try {
        saveData = JSON.parse(window.atob(saveData));
        console.log("emitting data loaded");
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
      <TextContainer
        userParams={userParams}
        setUserParams={setUserParams}
        setShowCategories={setShowCategories}
        days={days}
        setDays={setDays}
      />
      <ContainerLabels wildcardCategory={wildcardCategory} />
      <Categories
        show={showCategories}
        setWildcardCategory={setWildcardCategory}
      />
    </div>
  );
};

export default App;
