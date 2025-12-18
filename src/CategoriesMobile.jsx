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
  const [bananaChecked, setBananaChecked] = useState(false);

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
    setShowCards(false);
  };

  return (
    <div id="categories-mobile" className={cn}>
      <Modal modalMode={modalMode} setModalMode={setModalMode} />
      <div className={"categories-mobile-text "}>
        {showCards
          ? " Open a category to enter data."
          : "Each jelly bean represents a day in the rest of your life."}
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
        SEE CATEGORIES
      </button>

      {!showCards && (
        <div
          className="column-buttons-mobile"
          style={{ pointerEvents: show ? "auto" : "none" }}
        >
          {bananaChecked && (
            <div className="banana-disclaimer">
              *Banana is a rough estimation!
            </div>
          )}
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

          <div
            className="column-button"
            onClick={() => {
              if (!show) {
                return;
              }
              setModalMode("confirm-reset");
            }}
          >
            Reset All
          </div>

          <div
            className="column-button"
            onClick={() => {
              if (!show) {
                return;
              }
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
