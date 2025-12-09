import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

const Modal = (props) => {
  const { modalMode, setModalMode } = props;
  const [title, setTitle] = useState("");
  const [text, setText] = useState([]);
  const [buttons, setButtons] = useState([]);
  const [actions, setActions] = useState([]);
  const [leftAligned, setLeftAligned] = useState(false);

  useEffect(() => {
    setLeftAligned(false);
    if (modalMode == "info") {
      setTitle("About");
      setText([
        "This project uses data from the CDC's [National Vital Statistics Reports](https://www.ncbi.nlm.nih.gov/books/NBK614547/) for calculating life expectancy, based on death rates in 2022. This has the unfortunate effect of biasing results towards the United States population.",
        "Inspired by [All The Ghosts You Will Be](https://www.youtube.com/watch?v=xHd4zsIbXJ0) by Vsauce, and named as a homage to Wait But Why's [Your Life in Weeks](https://waitbutwhy.com/2014/05/life-weeks.html).",
        "Jelly beans may occasionally freak out from time to time. Consider it a metaphor.",
      ]);
      setButtons(["CLOSE"]);
      setActions([closeModal]);
      setLeftAligned(true);
    }
    if (modalMode == "confirm-reset") {
      setTitle("Are you sure?");
      setText(["This will clear data from all categories."]);
      setButtons(["CANCEL", "RESET"]);
      setActions([closeModal, resetCategories]);
    }
    if (modalMode == "start-over") {
      setTitle("Are you sure?");
      setText(["This will clear all data you've inputted so far."]);
      setButtons(["CANCEL", "START OVER"]);
      setActions([closeModal, startOver]);
    }
  }, [modalMode]);

  const closeModal = () => {
    setModalMode("none");
  };

  const resetCategories = () => {
    document.dispatchEvent(new CustomEvent("reset-categories"));
    setModalMode("none");
  };

  const startOver = () => {
    localStorage.clear();
    location.reload();
  };

  return (
    <div
      id="modal-container"
      className={modalMode == "none" ? "hidden" : ""}
      onClick={(e) => {
        if (e.target.id == "modal-container") {
          closeModal();
        }
      }}
    >
      <div id="modal">
        <div className="modal-title">{title}</div>
        <div className="modal-text-container">
          {text.map((t, i) => {
            return (
              <div
                key={"modal-text-" + i}
                className={"modal-text modal-text-" + modalMode}
              >
                <Markdown>{t}</Markdown>
              </div>
            );
          })}
        </div>
        <div className="modal-buttons-container">
          {buttons.map((b, i) => {
            return (
              <button
                key={"modal-button-" + i}
                id={"button-" + b}
                className="button modal-button"
                onClick={actions[i]}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Modal;
