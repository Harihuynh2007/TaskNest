import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import InboxPane from './panes/InboxPane';
import PlannerPane from './panes/PlannerPane';
import BoardPane from './panes/BoardPane';
import BottomFloatingNav from './BottomFloatingNav';
import FullCardModal from '../../components/FullCardModal';
import CardEditPopup from './CardEditPopup';
import { getBoard } from '../../api/boardApi.js';
import { DragDropContext } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';

export default function BoardDetailPage() {
  const { workspaceId, boardId } = useParams();
  const [background, setBackground] = useState('#e4f0f6');
  const [loading, setLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState(['inbox']);
  const [cards, setCards] = useState([]);
  const [lists, setLists] = useState([
    { id: 1, title: 'To Do', cards: [] },
    { id: 2, title: 'Doing', cards: [] },
    { id: 3, title: 'Done', cards: [] },
  ]);
  const [archived, setArchived] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [editPopup, setEditPopup] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    async function loadBoard() {
      if (!workspaceId || !boardId) return;
      setLoading(true);
      try {
        const res = await getBoard(workspaceId, boardId);
        setBackground(res.data.background || '#e4f0f6');
      } catch (err) {
        console.error('Lỗi fetch board:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [workspaceId, boardId]);

  useEffect(() => {
    const saved = localStorage.getItem(`board-${boardId}-cards`);
    if (saved) {
      setCards(JSON.parse(saved));
    }
  }, [boardId]);

  useEffect(() => {
    localStorage.setItem(`board-${boardId}-cards`, JSON.stringify(cards));
  }, [cards, boardId]);

  useEffect(() => {
    const socket = new WebSocket('ws://127.0.0.1:8000/ws/boards/' + boardId + '/');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'card_update') {
        setCards(data.cards);
      }
    };
    return () => socket.close();
  }, [boardId]);

  const handleAddCard = () => {
    if (inputValue.trim() === '') return;
    const newCard = {
      id: uuidv4(),
      title: inputValue,
      description: '',
      dueDate: null,
      completed: false,
    };
    setCards([...cards, newCard]);
    setInputValue('');
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'inbox') {
        const newCards = Array.from(cards);
        const [moved] = newCards.splice(source.index, 1);
        newCards.splice(destination.index, 0, moved);
        setCards(newCards);
      } else {
        const listId = parseInt(source.droppableId.replace('list-', ''));
        setLists((prev) => {
          const listIndex = prev.findIndex((l) => l.id === listId);
          if (listIndex === -1) return prev;
          const newLists = [...prev];
          const newCards = Array.from(newLists[listIndex].cards);
          const [moved] = newCards.splice(source.index, 1);
          newCards.splice(destination.index, 0, moved);
          newLists[listIndex] = { ...newLists[listIndex], cards: newCards };
          return newLists;
        });
      }
    } else {
      let movedCard;
      if (source.droppableId === 'inbox') {
        const newCards = Array.from(cards);
        [movedCard] = newCards.splice(source.index, 1);
        setCards(newCards);

        const destListId = parseInt(destination.droppableId.replace('list-', ''));
        setLists((prev) => prev.map((list) =>
          list.id === destListId ? { ...list, cards: [...list.cards.slice(0, destination.index), movedCard, ...list.cards.slice(destination.index)] } : list
        ));
      } else {
        const sourceListId = parseInt(source.droppableId.replace('list-', ''));
        setLists((prev) => {
          const sourceListIndex = prev.findIndex((l) => l.id === sourceListId);
          if (sourceListIndex === -1) return prev;
          const newLists = [...prev];
          const sourceCards = Array.from(newLists[sourceListIndex].cards);
          [movedCard] = sourceCards.splice(source.index, 1);
          newLists[sourceListIndex] = { ...newLists[sourceListIndex], cards: sourceCards };
          return newLists;
        });
        setCards((prev) => [...prev.slice(0, destination.index), movedCard, ...prev.slice(destination.index)]);
      }
    }
  };

  const toggleTab = (tabName) => {
    setActiveTabs((prev) =>
      prev.includes(tabName)
        ? prev.length > 1
          ? prev.filter((t) => t !== tabName)
          : prev
        : [...prev, tabName]
    );
  };

  const toggleComplete = (index) => {
    const updated = [...cards];
    updated[index].completed = true;
    setCards([...updated]);
    setTimeout(() => {
      const fresh = [...updated];
      const [completedCard] = fresh.splice(index, 1);
      setCards(fresh);
      setArchived((prev) => [...prev, completedCard]);
    }, 1000);
  };

  const handleSaveCard = () => {
    if (editPopup) {
      const updated = [...cards];
      updated[editPopup.index].title = editPopup.text;
      setCards(updated);
      setEditPopup(null);
    }
  };

  const renderPanes = () => (
    <SplitContainer>
      {activeTabs.includes('inbox') && (
        <InboxPane
          background={background}
          cards={cards}
          setCards={setCards}
          inputValue={inputValue}
          setInputValue={setInputValue}
          showInput={showInput}
          setShowInput={setShowInput}
          editPopup={editPopup}
          setEditPopup={setEditPopup}
          selectedCard={selectedCard}
          setSelectedCard={setSelectedCard}
          handleAddCard={handleAddCard}
          toggleComplete={toggleComplete}
          handleSaveCard={handleSaveCard}
        />
      )}
      {activeTabs.includes('planner') && <PlannerPane background={background} />}
      {activeTabs.includes('board') && <BoardPane background={background} lists={lists} setLists={setLists} />}
    </SplitContainer>
  );

  if (loading) return <div>Loading board...</div>;

  return (
    <>
      {editPopup && <DarkOverlay />}
      {selectedCard && (
        <FullCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      <BoardWrapper background={background}>
        <DragDropContext onDragEnd={onDragEnd}>
          {renderPanes()}
        </DragDropContext>
        <BottomFloatingNav activeTabs={activeTabs} toggleTab={toggleTab} activeCount={activeTabs.length} />
      </BoardWrapper>
    </>
  );
}

const BoardWrapper = styled.div`
  background: ${({ background }) => background};
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const SplitContainer = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  > * {
    flex: 1;
    min-width: 240px;
    overflow-y: auto;
    background: #ffffff;
    border-left: 1px solid #ddd;
    &:first-child {
      border-left: none;
    }
  }
`;

const DarkOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 998;
`;
