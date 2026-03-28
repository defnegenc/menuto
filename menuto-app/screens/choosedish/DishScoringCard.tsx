import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';
import { ParsedDish } from '../../types';
import { NoMenuState } from '../../components/NoMenuState';

const screenWidth = Dimensions.get('window').width;

interface DishScoringCardProps {
  selectedRestaurant: any;
  menuDishes: ParsedDish[];
  isLoadingMenu: boolean;
  showQuestions: boolean;
  // Review modal
  showReviewModal: boolean;
  onSetShowReviewModal: (show: boolean) => void;
  onConfirmMenu: () => void;
  onAddMoreItems: () => void;
  // Menu actions
  onAddMenuPDF: () => void;
  onPasteMenuText: () => void;
  onAddPhoto: () => void;
  // Text modal
  showTextModal: boolean;
  menuText: string;
  onSetShowTextModal: (show: boolean) => void;
  onSetMenuText: (text: string) => void;
  onSubmitMenuText: () => void;
  // URL modal
  showMenuUrlModal: boolean;
  menuUrls: string[];
  onSetShowMenuUrlModal: (show: boolean) => void;
  onSetMenuUrls: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmitMenuUrls: () => void;
}

export function DishScoringCard({
  selectedRestaurant,
  menuDishes,
  isLoadingMenu,
  showQuestions,
  showReviewModal,
  onSetShowReviewModal,
  onConfirmMenu,
  onAddMoreItems,
  onAddMenuPDF,
  onPasteMenuText,
  onAddPhoto,
  showTextModal,
  menuText,
  onSetShowTextModal,
  onSetMenuText,
  onSubmitMenuText,
  showMenuUrlModal,
  menuUrls,
  onSetShowMenuUrlModal,
  onSetMenuUrls,
  onSubmitMenuUrls,
}: DishScoringCardProps) {
  return (
    <>
      {/* Step 2: Show when restaurant is selected but menu not confirmed yet */}
      {!showQuestions && (
        <View style={styles.stepSection}>
          <Text style={styles.stepText}>Step 2: Add or confirm menu</Text>
          <View style={styles.stepUnderline} />
        </View>
      )}

      {/* Menu confirmed - show when menu is found and confirmed */}
      {menuDishes.length > 0 && showQuestions && (
        <>
          <View style={styles.separatorLine} />
          <View style={styles.menuConfirmedSection}>
            <Text style={styles.menuConfirmedText}>Menu confirmed</Text>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => onSetShowReviewModal(true)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.separatorLine} />
        </>
      )}

      {/* Menu loading and content */}
      {isLoadingMenu ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking menu...</Text>
        </View>
      ) : menuDishes.length > 0 ? (
        <>
          {!showQuestions && (
            <View style={styles.menuFoundSection}>
              <Text style={styles.menuFoundText}>Menu found!</Text>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => onSetShowReviewModal(true)}
              >
                <Text style={styles.reviewButtonText}>Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <View style={styles.noMenuSection}>
          <NoMenuState
            onAddMenuPDF={onAddMenuPDF}
            onPasteMenuText={onPasteMenuText}
            onAddPhoto={onAddPhoto}
          />
        </View>
      )}

      {/* Text Input Modal */}
      <Modal
        visible={showTextModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => onSetShowTextModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Paste Menu Text</Text>
            <TouchableOpacity onPress={onSubmitMenuText} disabled={!menuText.trim()}>
              <Text
                style={[
                  styles.modalSubmitButton,
                  !menuText.trim() && styles.modalSubmitButtonDisabled,
                ]}
              >
                Submit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Paste the menu text below. Include dish names, descriptions, and prices if available.
            </Text>

            <TextInput
              style={styles.textInput}
              value={menuText}
              onChangeText={onSetMenuText}
              placeholder="Paste menu text here..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* Review Menu Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => onSetShowReviewModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Menu Summary</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Review the menu items found for {selectedRestaurant?.name}
            </Text>

            {(() => {
              const grouped: { [key: string]: ParsedDish[] } = {};
              menuDishes.forEach((dish) => {
                const category = dish.category || 'other';
                if (!grouped[category]) {
                  grouped[category] = [];
                }
                grouped[category].push(dish);
              });

              return Object.keys(grouped).map((category) => (
                <View key={category} style={styles.reviewCategorySection}>
                  <Text style={styles.reviewCategoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  {grouped[category].slice(0, 5).map((dish, idx) => (
                    <View key={idx} style={styles.reviewDishItem}>
                      <Text style={styles.reviewDishName}>{dish.name}</Text>
                      {dish.description && (
                        <Text style={styles.reviewDishDescription}>{dish.description}</Text>
                      )}
                    </View>
                  ))}
                  {grouped[category].length > 5 && (
                    <Text style={styles.reviewMoreText}>
                      + {grouped[category].length - 5} more items
                    </Text>
                  )}
                </View>
              ));
            })()}
          </ScrollView>

          <View style={styles.reviewModalActions}>
            <TouchableOpacity
              style={styles.reviewActionButton}
              onPress={onAddMoreItems}
            >
              <Text style={styles.reviewActionButtonText}>Add more items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewActionButton, styles.reviewConfirmButton]}
              onPress={onConfirmMenu}
            >
              <Text
                style={[
                  styles.reviewActionButtonText,
                  styles.reviewConfirmButtonText,
                ]}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu URL Modal */}
      <Modal
        visible={showMenuUrlModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => onSetShowMenuUrlModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Menu URLs</Text>
            <TouchableOpacity onPress={onSubmitMenuUrls}>
              <Text style={styles.modalSubmitButton}>Parse</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Add one or more menu links (website, PDF, or image). We'll parse and save them to this restaurant.
            </Text>

            {menuUrls.map((value, idx) => (
              <View key={`menu-url-${idx}`} style={styles.menuUrlRow}>
                <TextInput
                  style={[styles.menuUrlInput, { flex: 1 }]}
                  value={value}
                  onChangeText={(text) => {
                    onSetMenuUrls((prev) =>
                      prev.map((p, i) => (i === idx ? text : p))
                    );
                  }}
                  placeholder="https://example.com/menu or menu.pdf"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {menuUrls.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeUrlButton}
                    onPress={() =>
                      onSetMenuUrls((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Text style={styles.removeUrlButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addUrlButton}
              onPress={() => onSetMenuUrls((prev) => [...prev, ''])}
            >
              <Text style={styles.addUrlButtonText}>+ Add another URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  stepSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  stepText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  stepUnderline: {
    height: 2,
    width: screenWidth * 0.9,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    alignSelf: 'center',
  },
  separatorLine: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  menuFoundSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuFoundText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
    flex: 1,
  },
  menuConfirmedSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuConfirmedText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
    flex: 1,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 4,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  noMenuSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancelButton: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButton: {
    fontSize: theme.typography.sizes.md,
    color: '#000000',
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButtonDisabled: {
    color: theme.colors.text.secondary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalInstructions: {
    fontSize: theme.typography.sizes.md,
    color: '#000000',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.regular,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'top',
  },
  menuUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  menuUrlInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  addUrlButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  addUrlButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  removeUrlButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.secondary,
  },
  removeUrlButtonText: {
    color: theme.colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  reviewCategorySection: {
    marginBottom: theme.spacing.lg,
  },
  reviewCategoryTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.normal,
    color: '#000000',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  reviewDishItem: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reviewDishName: {
    fontSize: 13,
    color: '#000000',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  reviewDishDescription: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  reviewMoreText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontFamilies.regular,
    marginTop: theme.spacing.xs,
  },
  reviewModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  reviewActionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  reviewConfirmButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reviewActionButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  reviewConfirmButtonText: {
    color: '#FFFFFF',
  },
});
