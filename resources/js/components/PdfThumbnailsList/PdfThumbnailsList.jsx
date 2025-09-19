import { useRef } from 'react';
import useIsDesktop from '../../hooks/useIsDesktop';
import useHorizontalDragScroll from '../../hooks/useHorizontalDragScroll';
import PdfThumbnail from '../PdfThumbnail/PdfThumbnail';
import './PdfThumbnailsList.css';

const PdfThumbnailsList = ({ products, selectedIndex, onSelect }) => {
  const isDesktop = useIsDesktop();
  const scrollRef = useRef(null);
  // Llama siempre el hook, pero solo aplica eventHandlers si es mobile
  const { eventHandlers } = useHorizontalDragScroll(scrollRef);

  return (
    <div
      ref={scrollRef}
      className={`pdf-thumbnails-list ${isDesktop ? 'vertical' : 'horizontal'}`}
      {...(!isDesktop ? eventHandlers : {})}
    >
      {products.map((product, idx) => (
        <PdfThumbnail
          key={product.id}
          image={product.image}
          selected={idx === selectedIndex}
          onClick={() => onSelect(idx)}
          showRemoveButton={false}
          isDragging={false}
        />
      ))}
    </div>
  );
};

export default PdfThumbnailsList; 