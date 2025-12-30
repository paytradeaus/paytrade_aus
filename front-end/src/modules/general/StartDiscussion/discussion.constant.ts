export const discussionPage = {
  "start discussion": {
    breadCrumbs: "Start discussion",
    editBreadCrumbs: "Edit discussion",
    cmty_content_type: "Discussion",
    masterType: "Discussion Topic",
    submitButton: "Start a discussion",
    editSubmitButton: "Update discussion",
    successToast: "Discussion added successfully",
    fields: [
      {
        label: "Ask a question",
        placeholder: "Be specific you can add more detail below",
        error: "Enter a question to start your discussion",
      },
      {
        label: "Choose a topic",
        placeholder: "",
        error: "Topic is required",
      },
      {
        label: "Add detail to get better answers",
        placeholder: "descriptive detail to get better answers",
      },
    ],
    hideStartDiscussion: true,
    hideCreateProductIdea: false,
    communityLink: "discussions",
  },
  "create product idea": {
    breadCrumbs: "Create product idea",
    editBreadCrumbs: "Edit product idea",
    cmty_content_type: "Idea",
    masterType: "Idea Category",
    submitButton: "Post idea",
    editSubmitButton: "Update idea",
    successToast: "Product idea added successfully",
    fields: [
      {
        label: "Enter your idea",
        placeholder: "Enter your new idea here",
        error: "Idea is required",
      },
      {
        label: "Choose a category",
        placeholder: "Select a category for your idea",
      },
      {
        label: "Describe your idea",
        placeholder: "Describe your idea",
      },
    ],
    hideStartDiscussion: false,
    hideCreateProductIdea: true,
    communityLink: "product-ideas",
  },
};
