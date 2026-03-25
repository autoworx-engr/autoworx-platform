import BookingContent from "../components/booking/BookingContent";
import { BookingProvider } from "../context/BookingContext";

const BookingPage = () => {
  return (
    <BookingProvider>
      <BookingContent />
    </BookingProvider>
  );
};

export default BookingPage;