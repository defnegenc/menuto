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
} from 'react-native';
import { theme } from '../../theme';
import { ParsedDish } from '../../types';
import { NoMenuState } from '../../components/NoMenuState';

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
          <ActivityIndicator size="large" color="#E9323D" />
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

const TERRA = '#E9323D';
const MEDIUM_COLOR = '#5A4D48';
const LIGHT_TEXT = '#8C7E77';

const styles = StyleSheet.create({
  stepSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  stepText: {
    fontSize: 13,
    color: MEDIUM_COLOR,
    marginBottom: theme.spacing.sm,
    fontFamily: 'DMSans-Regular',
  },
  stepUnderline: {
    height: 1,
    backgroundColor: '#E7E5E4',
    alignSelf: 'stretch',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#E7E5E4',
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
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -1.5,
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
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -1.5,
    flex: 1,
  },
  reviewButton: {
    backgroundColor: '#1C1917',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 999,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: '#A8A29E',
    fontFamily: 'DMSans-Regular',
  },
  noMenuSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  modalCancelButton: {
    fontSize: 14,
    color: MEDIUM_COLOR,
    fontFamily: 'DMSans-Regular',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
  },
  modalSubmitButton: {
    fontSize: 14,
    color: TERRA,
    fontFamily: 'DMSans-Bold',
  },
  modalSubmitButtonDisabled: {
    color: LIGHT_TEXT,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalInstructions: {
    fontSize: 14,
    color: MEDIUM_COLOR,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1C1917',
    fontFamily: 'DMSans-Regular',
    borderWidth: 1,
    borderColor: '#F5F5F4',
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
    borderColor: '#F5F5F4',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1C1917',
    backgroundColor: '#FAFAF9',
    fontFamily: 'DMSans-Regular',
  },
  addUrlButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
  },
  addUrlButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: TERRA,
  },
  removeUrlButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  removeUrlButtonText: {
    color: MEDIUM_COLOR,
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  reviewCategorySection: {
    marginBottom: theme.spacing.lg,
    backgroundColor: '#FAFAF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: theme.spacing.lg,
  },
  reviewCategoryTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewDishItem: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  reviewDishName: {
    fontSize: 14,
    color: '#1C1917',
    marginBottom: 4,
    fontFamily: 'DMSans-Medium',
  },
  reviewDishDescription: {
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'DMSans-Italic',
  },
  reviewMoreText: {
    fontSize: 12,
    color: LIGHT_TEXT,
    fontStyle: 'italic',
    fontFamily: 'DMSans-Regular',
    marginTop: theme.spacing.xs,
  },
  reviewModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    gap: theme.spacing.md,
  },
  reviewActionButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  reviewConfirmButton: {
    backgroundColor: '#1C1917',
    borderColor: '#1C1917',
  },
  reviewActionButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
  },
  reviewConfirmButtonText: {
    color: '#FFFFFF',
  },
});
