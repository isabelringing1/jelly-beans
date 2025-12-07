import { useState, useRef, useEffect } from "react";

import ContainerLabel from "./ContainerLabel";
import categories from "./json/categories.json";

const ContainerLabels = (props) => {
  const { wildcardCategory } = props;
  const [posArray, setPosArray] = useState([]);
  const [catDict, setCatDict] = useState({});

  useEffect(() => {
    document.addEventListener("screen-data", onScreenDataEvent);
    var newCatDict = {};
    for (var i = 0; i < categories["column-1"].length; i++) {
      newCatDict[categories["column-1"][i].index] = categories["column-1"][i];
    }
    for (var i = 0; i < categories["column-3"].length; i++) {
      newCatDict[categories["column-3"][i].index] = categories["column-3"][i];
    }
    for (var i = 0; i < categories["other"].length; i++) {
      newCatDict[categories["other"][i].index] = categories["other"][i];
    }
    setCatDict(newCatDict);
  }, []);

  const onScreenDataEvent = (e) => {
    setPosArray(e.detail.data);
  };

  return (
    <div id="container-labels">
      {posArray.map((pos, i) => {
        return (
          <ContainerLabel
            pos={pos}
            key={"label-" + i}
            category={catDict[parseInt(pos.index)]}
            wildcardCategory={wildcardCategory}
          />
        );
      })}
    </div>
  );
};

export default ContainerLabels;
