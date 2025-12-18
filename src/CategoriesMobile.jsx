import { useState, useEffect } from "react";
import Switch from "@mui/material/Switch";
import CategoryCard from "./CategoryCard";
import Modal from "./Modal";

import categories from "./json/categories.json";

const CategoriesMobile = (props) => {
  const { show, setWildcardCategory } = props;

  var cn = show ? "" : "hidden";
  const [showHelper, setShowHelper] = useState(true);
  const [showCards, setShowCards] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [modalMode, setModalMode] = useState("none"); // none, info
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    document.addEventListener("overboard", () => {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 1000);
    });
  }, []);

  var cats = [...categories["column-1"], ...categories["column-3"]];
  console.log(cats);

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

  const onCardDonePressed = () => {
    console.log("done pressed");
    setShowCards(false);
  };

  return (
    <div id="categories-mobile" className={cn}>
      <Modal modalMode={modalMode} setModalMode={setModalMode} />
      <div
        className={
          "categories-mobile-text " + (showHelper && showCards ? "" : "hidden")
        }
      >
        Open a category to enter data.
      </div>
      {showError && (
        <div className="column-error">
          Not enough Jelly Beans! Check your data.
        </div>
      )}
      <div
        className={"categories-mobile-x " + (showCards ? "" : "hidden")}
        onClick={() => setShowCards(false)}
      >
        ×
      </div>
      <div className={"category-cards-mobile " + (showCards ? "" : "hidden")}>
        {cats.map((question, i) => {
          return (
            <CategoryCard
              card={question}
              index={question.index}
              key={"category-" + i}
              categoryCardClicked={onCategoryCardClicked}
              setSelectedCardIndex={setSelectedCardIndex}
              selected={question.index == selectedCardIndex}
              setWildcardCategory={setWildcardCategory}
              isMobile={true}
              onDonePressed={onCardDonePressed}
            />
          );
        })}
      </div>
      <button
        className={"button input-data-button " + (showCards ? "hidden" : "")}
        onClick={() => {
          setShowCards(true);
        }}
      >
        INPUT DATA
      </button>

      {!showCards && (
        <div className="column-buttons-mobile">
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
          <div
            className="info-button"
            onClick={() => {
              setModalMode("info");
            }}
          >
            ?
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesMobile;
