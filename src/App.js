import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, orderBy, query
} from "firebase/firestore";
import "./App.css";

const CARD_COLORS = [
  "#F9D343", "#F4A261", "#A8D8A8", "#F28B82",
  "#B5C7F5", "#FFD166", "#A0D2DB", "#D4A5F5",
];

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

function NoteModal({ onClose, onSave, initial = "" }) {
  const [text, setText] = useState(initial);
  const isEdit = initial !== "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEdit ? "Edit Note" : "New Note"}</h2>
        <textarea
          className="modal-input"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-add"
            onClick={() => { if (text.trim()) onSave(text.trim()); }}
            disabled={!text.trim() || text.trim() === initial.trim()}
          >
            {isEdit ? "Save Changes" : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setNotes(snap.docs.map((d, i) => ({
          id: d.id,
          text: d.data().text,
          createdAt: d.data().createdAt?.toDate() || new Date(),
          color: CARD_COLORS[i % CARD_COLORS.length],
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const saveNote = async (text) => {
    try {
      const color = CARD_COLORS[notes.length % CARD_COLORS.length];
      const ref = await addDoc(collection(db, "notes"), {
        text, createdAt: new Date(),
      });
      setNotes((prev) => [{ id: ref.id, text, createdAt: new Date(), color }, ...prev]);
      setShowModal(false);
    } catch (e) { console.error(e); }
  };

  const updateNote = async (text) => {
    try {
      await updateDoc(doc(db, "notes", editingNote.id), { text });
      setNotes((prev) =>
        prev.map((n) => n.id === editingNote.id ? { ...n, text } : n)
      );
      setEditingNote(null);
    } catch (e) { console.error(e); }
  };

  const deleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, "notes", id));
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const filtered = notes.filter((n) =>
    n.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <span className="logo">Note-ify</span>
        <button className="fab" onClick={() => setShowModal(true)}>+</button>
      </aside>

      <div className="content">
        <div className="topbar">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="#999" strokeWidth="1.8" />
              <path d="M13 13l3.5 3.5" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              className="search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <h1 className="page-title">Notes</h1>

        {loading ? (
          <p className="hint">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="hint">
            {search ? "No notes match your search." : "No notes yet. Hit + to add one."}
          </p>
        ) : (
          <div className="cards-grid">
            {filtered.map((n, i) => (
              <div
                key={n.id}
                className="card"
                style={{ background: n.color, animationDelay: `${i * 0.06}s` }}
              >
                <p className="card-text">{n.text}</p>
                <div className="card-footer">
                  <span className="card-date">{formatDate(n.createdAt)}</span>
                  <div className="card-actions">
                    <button
                      className="card-action-btn edit-btn"
                      onClick={() => setEditingNote(n)}
                      title="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                        <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17l-4 1 1-4L14.5 2.5z"
                          stroke="rgba(0,0,0,0.55)" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="card-action-btn del-btn"
                      onClick={() => deleteNote(n.id)}
                      title="Delete"
                    >
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                        <path d="M5 5l10 10M15 5L5 15"
                          stroke="rgba(0,0,0,0.55)" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NoteModal onClose={() => setShowModal(false)} onSave={saveNote} />
      )}
      {editingNote && (
        <NoteModal
          onClose={() => setEditingNote(null)}
          onSave={updateNote}
          initial={editingNote.text}
        />
      )}
    </div>
  );
}

export default App;