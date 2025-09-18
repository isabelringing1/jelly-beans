import { useState, useEffect } from "react";
import TextContainer from "./TextContainer.jsx";
import { initializeLifeTables } from "./util/TimeCalculator.js";

const App = () => {
  const [userParams, setUserParams] = useState({});

  useEffect(() => {
    fetch("/public/life_tables.csv")
      .then((response) => response.text())
      .then((lifeTables) => {
        initializeLifeTables(lifeTables);
      });
  }, []);

  return (
    <div id="content">
      <TextContainer userParams={userParams} setUserParams={setUserParams} />
    </div>
  );
};

export default App;
