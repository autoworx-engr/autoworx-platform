import BookingContent from "../components/booking/BookingContent";
import { BookingProvider } from "../context/BookingContext";

const BookingPage = ({ initialShop }: { initialShop?: any }) => {
  return (
    <BookingProvider>
      <BookingContent initialShop={initialShop} />
    </BookingProvider>
  );
};

export default BookingPage;
