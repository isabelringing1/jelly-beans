import { useState, useEffect } from "react";
import TextContainer from "./TextContainer.jsx";
import Categories from "./Categories.jsx";
import ContainerLabels from "./ContainerLabels.jsx";
import { initializeLifeTables } from "./util/TimeCalculator.js";

const App = () => {
  const [userParams, setUserParams] = useState({});
  const [showCategories, setShowCategories] = useState(false);
  const [wildcardCategory, setWildcardCategory] = useState("gaming");

  useEffect(() => {
    fetch("/public/life_tables.csv")
      .then((response) => response.text())
      .then((lifeTables) => {
        initializeLifeTables(lifeTables);
      });
  }, []);

  return (
    <div id="content">
      <TextContainer
        userParams={userParams}
        setUserParams={setUserParams}
        setShowCategories={setShowCategories}
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
