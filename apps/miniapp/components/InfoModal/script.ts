import { defineComponent } from "vue";

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["close"],
  setup(_, { emit }) {
    return { emit };
  },
});
