import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

const Modal = (props) => {
  const { modalMode, setModalMode } = props;
  const [title, setTitle] = useState("");
  const [text, setText] = useState([]);
  const [buttons, setButtons] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    if (modalMode == "info") {
      setTitle("About");
      setText([
        "Life expectancy is calculated using the CDC's [National Vital Statistics Reports](https://www.ncbi.nlm.nih.gov/books/NBK614547/), based off data collected in 2022.",
      ]);
      setButtons(["CLOSE"]);
      setActions([closeModal]);
    }
    if (modalMode == "confirm-reset") {
      setTitle("Are you sure?");
      setText(["This will clear data from all categories."]);
      setButtons(["CANCEL", "RESET"]);
      setActions([closeModal, resetCategories]);
    }
  }, [modalMode]);

  const closeModal = () => {
    setModalMode("none");
  };

  const resetCategories = () => {
    document.dispatchEvent(new CustomEvent("reset-categories"));
    setModalMode("none");
  };

  return (
    <div
      id="modal-container"
      className={modalMode == "none" ? "hidden" : ""}
      onClick={(e) => {
        console.log(e.target.id);
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
              <div key={"modal-text-" + i} className="modal-text">
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
