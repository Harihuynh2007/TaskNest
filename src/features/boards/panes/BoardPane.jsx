import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import BoardSubHeader from '../../../components/BoardSubHeader';
import { FaPlus, FaTimes } from 'react-icons/fa';
import ListColumn from '../../../components/ListColumn';
import FullCardModal from '../../../components/Card/FullCardModal';
import CardEditPopup from '../../../components/Card/CardEditPopup';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createList, fetchLists, updateList } from '../../../api/listApi';
import { createCard, fetchCards, updateCard } from '../../../api/cardApi';
import BoardFilterPopup from '../../../components/filter/BoardFilterPopup'; 
import { fetchBoardMembers, fetchBoardLabels } from '../../../api/boardApi'; 
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);

function getTextColor(bg) {
  const hex = bg?.startsWith('#') ? bg.slice(1) : 'ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#172b4d' : 'white';
}

export default function BoardPane({ background, boardId, lists, setLists }) {
  const [, setCards] = useState([]);
  
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [activeCardInput, setActiveCardInput] = useState(null);
  const [cardInputs, setCardInputs] = useState({});
  const [editPopup, setEditPopup] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ keyword: '', status: 'all', due: 'all', members: [], labels: [] });
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const filterButtonRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch lists and cards
        const resLists = await fetchLists(boardId);
        const listsWithCards = await Promise.all(
          resLists.data.map(async (list) => {
            const resCards = await fetchCards(list.id);
            return { ...list, cards: Array.isArray(resCards.data) ? resCards.data : [] };
          })
        );
        setLists(listsWithCards);

        // Fetch members and labels
        const resMembers = await fetchBoardMembers(boardId);
        const resLabels = await fetchBoardLabels(boardId);
        setMembers(resMembers.data || []);
        setLabels(resLabels.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch data:', err);
      }
    };
    if (boardId) loadData();
  }, [boardId]);

  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      const res = await createList(boardId, {
        name: newListTitle,
        background: '',
        visibility: 'private',
        board: boardId,
      });
      setLists((prev) => [...prev, { ...res.data, cards: [] }]);
      setNewListTitle('');
      setShowAddList(false);
    } catch (err) {
      console.error('❌ Failed to create list:', err);
    }
  };

  const handleAddCard = async (listId) => {
    const text = cardInputs[listId]?.trim();
    if (!text) return;
    const targetList = lists.find((l) => l.id === listId);
    try {
      const res = await createCard(listId, {
        name: text,
        status: 'doing',
        background: '',
        visibility: 'private',
        position: targetList?.cards?.length || 0,
      });
      const newCard = res.data;
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId ? { ...list, cards: [...(list.cards || []), newCard] } : list
        )
      );
      setCardInputs((prev) => ({ ...prev, [listId]: '' }));
      setActiveCardInput(null);
    } catch (err) {
      console.error('❌ Failed to create card:', err);
    }
  };

  // Logic lọc cards
  const filteredLists = lists.map((list) => ({
    ...list,
    cards: list.cards.filter((card) => {
      const matchKeyword = card.name.toLowerCase().includes(filter.keyword.toLowerCase());
      const matchStatus =
        filter.status === 'all' ||
        (filter.status === 'completed' && card.completed) ||
        (filter.status === 'incomplete' && !card.completed);

      const matchDue =
        filter.due === 'all' ||
        (filter.due === 'none' && !card.due_date) ||
        (filter.due === 'overdue' && card.due_date && dayjs(card.due_date).isBefore(dayjs(), 'day') && !card.completed) ||
        (filter.due === 'today' && card.due_date && dayjs(card.due_date).isSame(dayjs(), 'day')) ||
        (filter.due === 'week' && card.due_date && dayjs(card.due_date).isoWeek() === dayjs().isoWeek());

      const matchMembers = filter.members.length === 0 || (card.assignee && filter.members.includes(card.assignee));
      const matchLabels = filter.labels.length === 0 || (card.labels && filter.labels.some(label => card.labels.includes(label)));

      return matchKeyword && matchStatus && matchDue && matchMembers && matchLabels;
    }),
  }));

  // Cập nhật vị trí popup lọc
  useEffect(() => {
    if (showFilter && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 320 - 8, // 320 = popup width, 8px = khoảng cách
      });
    }
  }, [showFilter]);

  const textColor = getTextColor(background);

  const toggleMemberFilter = (memberId) => {
    setFilter((prev) => {
      const newMembers = prev.members.includes(memberId)
        ? prev.members.filter((id) => id !== memberId)
        : [...prev.members, memberId];
      return { ...prev, members: newMembers };
    });
  };

  const toggleLabelFilter = (labelId) => {
    setFilter((prev) => {
      const newLabels = prev.labels.includes(labelId)
        ? prev.labels.filter((id) => id !== labelId)
        : [...prev.labels, labelId];
      return { ...prev, labels: newLabels };
    });
  };

  return (
    <Wrapper background={background}>
      <BoardSubHeader
        boardName="My Board"
        setShowFilter={setShowFilter}
        filterButtonRef={filterButtonRef} // Truyền ref cho nút lọc
      />
      {editPopup && <DarkOverlay />}
      {selectedCard && 
      <FullCardModal 
      card={selectedCard} 
      onClose={() => setSelectedCard(null)}
      onCardUpdate={(updatedCard) => {
        setLists((prevLists) =>
          prevLists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === updatedCard.id ? updatedCard : card
            ),
          }))
        ); 
      }}

      />}
      
      {editPopup && (
        <CardEditPopup
          isInboxMode={false}
          anchorRect={editPopup.anchorRect}
          cardText={editPopup.text}
          onChange={(val) => setEditPopup({ ...editPopup, text: val })}
          onSave={() => {
            setLists((prev) =>
              prev.map((list) =>
                list.id === editPopup.listId
                  ? {
                      ...list,
                      cards: list.cards.map((c, i) =>
                        i === editPopup.index ? { ...c, name: editPopup.text } : c
                      ),
                    }
                  : list
              )
            );
            setEditPopup(null);
            
          }}
          onClose={() => setEditPopup(null)}
          onOpenFullCard={() => {
            setEditPopup(null);
            setSelectedCard(editPopup.card);
          }}
          card={editPopup.card}
          listId={editPopup.listId}
          boardId={boardId}
          updateCardLabels={async (cardId, labels) => {
            try {
              await updateCard(cardId, { labels });
              setLists((prev) =>
                prev.map((list) =>
                  list.id === editPopup.listId
                    ? {
                        ...list,
                        cards: list.cards.map((c) =>
                          c.id === cardId ? { ...c, labels } : c
                        ),
                      }
                    : list
                )
              );
            } catch (err) {
              console.error('❌ Failed to update card labels:', err);
            }
          }}
        />
      )}
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <BoardContent {...provided.droppableProps} ref={provided.innerRef}>
              {filteredLists.map((list, index) => (
                <Draggable key={list.id} draggableId={`list-${list.id}`} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <ListColumn
                        list={list}
                        background={background}
                        textColor={textColor}
                        cardInput={cardInputs[list.id] || ''}
                        setCardInputs={setCardInputs}
                        activeCardInput={activeCardInput}
                        setActiveCardInput={setActiveCardInput}
                        onAddCard={handleAddCard}
                        onEditClick={(e, card, index) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setEditPopup({ anchorRect: rect, index, text: card.name, card, listId: list.id });
                        }}
                        onCheckClick={(index) => {
                          setLists((prev) =>
                            prev.map((l) =>
                              l.id === list.id
                                ? {
                                    ...l,
                                    cards: l.cards.map((c, i) =>
                                      i === index ? { ...c, completed: !c.completed } : c
                                    ),
                                  }
                                : l
                            )
                          );
                        }}
                        onCardClick={(card) => setSelectedCard(card)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </BoardContent>
          )}
        </Droppable>

      {showAddList ? (
        <AddListForm onSubmit={handleAddList}>
          <ListTitleInput
            placeholder="Enter list title..."
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            autoFocus
          />
          <AddListButtons>
            <AddBtn type="submit">Add list</AddBtn>
            <AddFromBtn type="button">Add from ▾</AddFromBtn>
            <CloseBtn type="button" onClick={() => setShowAddList(false)}><FaTimes /></CloseBtn>
          </AddListButtons>
        </AddListForm>
      ) : (
        <AddListTrigger onClick={() => setShowAddList(true)}>
          <FaPlus /> Add another list
        </AddListTrigger>
      )}

      {showFilter && (
        <BoardFilterPopup
          filter={filter}
          setFilter={setFilter}
          onClose={() => setShowFilter(false)}
          position={popupPos}
          members={members}
          toggleMemberFilter={toggleMemberFilter}
          labels={labels}
          toggleLabelFilter={toggleLabelFilter}
        />
      )}
    </Wrapper>
  );
}

// (Styled components giữ nguyên như trước)
const Wrapper = styled.div`background: ${(props) => props.background}; height: 100%; overflow: auto;`;
const DarkOverlay = styled.div`position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 998;`;

const BoardContent = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
  padding: 12px;
  overflow-x: auto;
`;

const ListTitleInput = styled.textarea`
  width: 100%;
  min-height: 20px;
  max-height: 256px;
  height: 32px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: #172b4d;
  background-color: #ffffff;
  box-shadow: inset 0 0 0 1px #091e4224;
  outline: none;
  overflow: hidden;
  box-sizing: border-box;
  transition: background-color 85ms ease, border-color 85ms ease, box-shadow 85ms ease;

  &:focus {
    box-shadow: inset 0 0 0 2px #28a745;
  }
`;

const AddListForm = styled.form`
  display: flex;
  flex-direction: column;
  min-width: 272px;
  max-width: 272px;
  background-color: #ffffff3d;
  padding: 12px;
  border-radius: 12px;
`;

const AddListTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 272px;
  padding: 12px;
  border-radius: 12px;
  background-color: #ffffff3d;
  border: none;
  color: #172b4d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 85ms ease;

  &:hover {
    background-color: #ffffff52;
  }
`;


const AddListButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const AddBtn = styled.button`
  background-color: #28a745;
  color: white;
  padding: 6px 12px;
  font-weight: 500;
  border: none;
  border-radius: 3px;
  cursor: pointer;
`;

const AddFromBtn = styled.button`
  background: transparent;
  border: none;
  color: #172b4d;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  color: #44546f;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #172b4d;
  }
`;