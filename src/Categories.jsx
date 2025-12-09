import { useState, useEffect } from "react";
import Switch from "@mui/material/Switch";
import CategoryCard from "./CategoryCard";
import Modal from "./Modal";

import categories from "./json/categories.json";

const Categories = (props) => {
  const { show, setWildcardCategory } = props;
  var cn = show ? "" : "hidden";
  var column1 = categories["column-1"];
  var column3 = categories["column-3"];

  const [showHelper, setShowHelper] = useState(true);
  const [showError, setShowError] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [modalMode, setModalMode] = useState("none"); // none, info
  const [bananaChecked, setBananaChecked] = useState(false);

  useEffect(() => {
    document.addEventListener("overboard", () => {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 1000);
    });
  }, []);

  const onCategoryCardClicked = () => {
    setShowHelper(false);
  };
  return (
    <div
      id="categories"
      className={cn}
      onClick={(e) => {
        if (!e.target.closest(".category-card")) {
          setSelectedCardIndex(-1);
        }
      }}
    >
      <div className="column" id="column-1">
        {column1.map((question, i) => {
          return (
            <CategoryCard
              card={question}
              index={question.index}
              key={"category-" + i}
              categoryCardClicked={onCategoryCardClicked}
              setSelectedCardIndex={setSelectedCardIndex}
              selected={question.index == selectedCardIndex}
              setWildcardCategory={setWildcardCategory}
            />
          );
        })}
        ;
      </div>
      <div className="column" id="column-2">
        <div
          className={"column-2-text top-text " + (showHelper ? "" : "hidden")}
        >
          Click on each section to enter data.
        </div>
        {showError && (
          <div className="column-error">
            Not enough Jelly Beans! Check your data.
          </div>
        )}
        <div className="column-2-text bottom-text">
          Each jelly bean represents a day in the rest of your life.
        </div>

        <div className="banana-switch">
          Banana for Scale
          <Switch
            checked={bananaChecked}
            onChange={() => {
              setBananaChecked(!bananaChecked);
              document.dispatchEvent(new CustomEvent("toggle-banana"));
            }}
          />
        </div>
        {bananaChecked && (
          <div className="banana-disclaimer">
            *Banana is a rough estimation!
          </div>
        )}

        <div className="column-buttons">
          <div
            className="column-button"
            onClick={() => {
              setModalMode("confirm-reset");
            }}
          >
            Reset All
          </div>

          <div
            className="column-button"
            onClick={() => {
              setModalMode("start-over");
            }}
          >
            Start Over
          </div>
        </div>
        <div
          className="info-button"
          onClick={() => {
            setModalMode("info");
          }}
        >
          ?
        </div>
        <Modal modalMode={modalMode} setModalMode={setModalMode} />
      </div>
      <div className="column" id="column-3">
        {column3.map((question, i) => {
          return (
            <CategoryCard
              card={question}
              index={question.index}
              key={"category-" + i}
              categoryCardClicked={onCategoryCardClicked}
              setSelectedCardIndex={setSelectedCardIndex}
              selected={selectedCardIndex == question.index}
              setWildcardCategory={setWildcardCategory}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
