import { defineComponent } from "vue";
import type { TransactionDto } from "@finance-bot/shared";
import { formatDate, formatTime } from "~/utils/format";

export default defineComponent({
  props: {
    transaction: {
      type: Object as () => TransactionDto,
      required: true,
    },
    showPerson: { type: Boolean, default: false },
  },
  emits: ["edit", "delete"],
  setup(props, { emit }) {
    return { emit, formatDate, formatTime };
  },
});
