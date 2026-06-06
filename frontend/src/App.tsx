import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CameraPage from './pages/CameraPage';
import PurchaseAnalyzePage from './pages/PurchaseAnalyzePage';
import PurchasePlansPage from './pages/PurchasePlansPage';
import ProductSearchPage from './pages/ProductSearchPage';
import TakeoutStorePage from './pages/TakeoutStorePage';
import TakeoutMerchantsPage from './pages/TakeoutMerchantsPage';
import PremadeFreshPage from './pages/PremadeFreshPage';
import PremadeChannelPage from './pages/PremadeChannelPage';
import OrderConfirmPage from './pages/OrderConfirmPage';
import ScenarioBundlesPage from './pages/ScenarioBundlesPage';
import ProfilePage from './pages/ProfilePage';
import RecipeCollectionPage from './pages/RecipeCollectionPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Index />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/purchase/analyze" element={<PurchaseAnalyzePage />} />
          <Route path="/purchase/plans" element={<PurchasePlansPage />} />
          <Route path="/purchase/products" element={<ProductSearchPage />} />
          <Route path="/takeout/merchants" element={<TakeoutMerchantsPage />} />
          <Route path="/takeout/store" element={<TakeoutStorePage />} />
          <Route path="/premade" element={<PremadeFreshPage />} />
          <Route path="/premade/channels" element={<PremadeChannelPage />} />
          <Route path="/purchase/order" element={<OrderConfirmPage />} />
          <Route path="/scenarios" element={<ScenarioBundlesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/collection" element={<RecipeCollectionPage />} />
          <Route path="/history/:type" element={<HistoryPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
