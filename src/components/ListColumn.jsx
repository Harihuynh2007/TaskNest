import React from 'react';
import styled from 'styled-components';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import CardItem from './Card/CardItem';

function ListColumn({
  list,
  background,
  textColor,
  cardInput,
  setCardInputs,
  activeCardInput,
  setActiveCardInput,
  onAddCard,
  onEditClick,
  onCheckClick,
  onCardClick,
  hideEmptyCards = false,
}) {
  const handleInputChange = (e) => {
    setCardInputs((prev) => ({ ...prev, [list.id]: e.target.value }));
  };

  const handleAddCard = (e) => {
    e.preventDefault(); // ✅ ngăn reload khi submit form
    onAddCard(list.id); // giữ nguyên logic của bạn
  };


  const isInputActive = activeCardInput === list.id;
  const hasCards = Array.isArray(list.cards) && list.cards.length > 0;

  return (
    <Wrapper>
      <Header style={{ color: textColor }}>{list.name}</Header>

      {/* ✅ Vùng thả cho các card */}
      <Droppable droppableId={`list-${list.id}`} type="CARD">
        {(provided) => (
          <CardList ref={provided.innerRef} {...provided.droppableProps}>
            {hasCards &&
              list.cards.map((card, index) => (
                <li key={card.id}>
                  <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        draggingOver={snapshot.isDraggingOver ? 1 : 0}
                      >
                        <CardItem
                          draggingOver={snapshot.draggingOver}
                          card={card}
                          index={index}
                          isDragging={snapshot.isDragging}
                          onEditClick={(e) => onEditClick(e, card, index)}
                          onCheckClick={() => onCheckClick(index)}
                          onCardClick={onCardClick}
                        />
                      </div>
                    )}
                  </Draggable>
                </li>
                  
              ))}
              {/* ✅ Thêm card mới */}
              {isInputActive ? (
                <li>
                  <CardComposerForm onSubmit={handleAddCard}>
                    <StyledTextarea
                      value={cardInput}
                      onChange={handleInputChange}
                      placeholder="Enter a title or paste a link"
                      autoFocus
                    />
                    <CardComposerActions>
                      <AddCardButton type="submit">Add card</AddCardButton>
                      <CancelButton type="button" onClick={() => setActiveCardInput(null)}>✕</CancelButton>
                    </CardComposerActions>
                  </CardComposerForm>
                </li>
            ) : (
              <AddCardBtn onClick={() => setActiveCardInput(list.id)}>+ Add a card</AddCardBtn>
            )}
            {provided.placeholder}
          </CardList>
        )}
      </Droppable>

    </Wrapper>
  );
}

export default React.memo(ListColumn);

// 💅 Styled components
const Wrapper = styled.div`
  min-width: 260px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
`;

const Header = styled.h3`
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const CardList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px; // Ensure droppable area is visible even when empty
  background: ${({ draggingOver }) =>
    draggingOver ? 'rgba(12, 102, 228, 0.1)' : 'transparent'}; // Subtle highlight
  border-radius: 6px;
  transition: background 0.2s ease;
  width: 100%; // Ensure full width within container
  overflow: hidden; // Prevent overflow during dragging
`;



const AddCardBtn = styled.button`
  margin-top: 8px;
  background: transparent;
  border: none;
  color: #172b4d;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
`;


const CardComposerForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 56px;
  padding: 8px;
  font-size: 14px;
  border: none;
  border-radius: 3px;
  resize: none;
  box-shadow: inset 0 0 0 2px #28a745;
  outline: none;
`;

const CardComposerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AddCardButton = styled.button`
  background-color: #28a745;
  color: white;
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  border-radius: 3px;
  font-weight: 500;
  cursor: pointer;
`;

const CancelButton = styled.button`
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #44546f;

  &:hover {
    color: #172b4d;
  }
`;
