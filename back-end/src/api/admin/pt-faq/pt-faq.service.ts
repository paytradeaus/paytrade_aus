import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FAQ } from 'src/entities/admin-faq.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { Repository } from 'typeorm';
import { AddFaQInput } from './dto/add-faq.dto';
import { UpdateFaQInput } from './dto/update-faq.dto ';
import { UpdateOrderInput } from './dto/update-order.dto';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class PtFaqService {
    private logger: PaytradeLogger;
    constructor(
        @InjectRepository(FAQ) private faqDetails: Repository<FAQ>,
        @InjectRepository(MasterTypes) private masterDetails: Repository<MasterTypes>,
    ) {
        this.logger = new PaytradeLogger('FAQ');
    }

    async create(addFaqInput: AddFaQInput) {
        let category;
        this.logger.log(
            `New FAQ addition initiated:  (${JSON.stringify(addFaqInput)})`,
        );
        if (addFaqInput.categoryId) {
            category = await this.masterDetails.findOne({ where: { id: addFaqInput.categoryId } });
            if (!category) {
                throw new Error(`FAQ Category does not exist.`);
            }
        }
        else {
            // If no categoryId is provided, fetch the 'General' category by default
            category = await this.masterDetails.findOne({ where: { master_type: 'FAQ Category', value: 'General' } });
        }
        const faq = this.faqDetails.create({
            question: addFaqInput.question,
            answer: addFaqInput.answer,
            faq_status: addFaqInput.faq_status,
            category: category, // Setting the category
            categoryOrder: await this.getMaxCategoryOrder(category.id) + 1,
            globalOrder: await this.getMaxGlobalOrder() + 1,

        });
        return await this.faqDetails.save(faq);
    }

    private async getMaxCategoryOrder(category: string): Promise<number> {
        const maxOrder = await this.faqDetails.createQueryBuilder('faq')

            .leftJoinAndSelect('faq.category', 'category')
            .where('category.value = :category', { category })
            .select('MAX(faq.categoryOrder)', 'maxOrder')
            .getRawOne();

        return maxOrder.maxOrder || 0;
    }

    private async getMaxGlobalOrder(): Promise<number> {
        const maxOrder = await this.faqDetails.createQueryBuilder('faq')
            .select('MAX(faq.globalOrder)', 'maxOrder')
            .getRawOne();

        return maxOrder.maxOrder || 0;
    }

    async updateFAQOrder(updateOrderDto: UpdateOrderInput): Promise<any> {
        const { category, faqId, previousFaqId } = updateOrderDto;

         this.logger.log(
            `FAQ order update initiated`
        );

        if (category) {
            return await this.updateCategoryOrder(category, faqId, previousFaqId);
        } else {
            return await this.updateGlobalOrder(faqId, previousFaqId);
        }
    }

    async updateCategoryOrder(category: string, faqId: string, previousFaqId: string | null): Promise<any> {
        const categoryDetails = await this.masterDetails.findOne({ where: { master_type: 'FAQ Category', value: category } });
        if (!categoryDetails) {
            throw new Error(`Category not found.`);
        }

        const faqToUpdate = await this.faqDetails.findOne({ where: { id: faqId }, relations: ['category'] });
        if (!faqToUpdate || faqToUpdate.category?.id !== categoryDetails.id) {
            throw new Error(`FAQ not found in the specified category.`);

        }

        const previousFaq = previousFaqId ? await this.faqDetails.findOne({ where: { id: previousFaqId, } }) : null;

        // If previousFaqId is null, move the FAQ to the first position in the category
        if (!previousFaq) {
            const categoryId = categoryDetails.id
            await this.faqDetails.createQueryBuilder()
                .update()
                .set({ categoryOrder: () => '"categoryOrder" + 1' })
                .where('"categoryId" = :categoryId', { categoryId })
                .execute();
            faqToUpdate.categoryOrder = 1;
        } else {
            const categoryId = categoryDetails.id
            // Get the order of the previous FAQ
            const previousOrder = previousFaq.categoryOrder || 0;
            // Increment the order of all FAQs that come after the previous FAQ
            await this.faqDetails.createQueryBuilder()
                .update()
                .set({ categoryOrder: () => '"categoryOrder" + 1' })
                .where('"categoryId" = :categoryId AND "categoryOrder" >= :order', { categoryId, order: previousOrder })
                .execute();
            // Set the order of the FAQ being updated to come after the previous FAQ
            faqToUpdate.categoryOrder = previousOrder + 1;
        }

        const orderUpdate = await this.faqDetails.save(faqToUpdate);
        const categoryId = categoryDetails.id

        const allFaqs = await this.faqDetails.find({ where: { category: { id: categoryId } } });
        allFaqs.sort((a, b) => a.categoryOrder - b.categoryOrder);
        for (let i = 0; i < allFaqs.length; i++) {
            const faq = allFaqs[i];
            faq.categoryOrder = i + 1;
            await this.faqDetails.save(faq);
        }

        return orderUpdate;
    }

    async updateGlobalOrder(faqId: string, previousFaqId: string | null): Promise<any> {
        const faqToUpdate = await this.faqDetails.findOne({ where: { id: faqId } });
        if (!faqToUpdate) {
            throw new Error(`FAQ not found.`);
        }

        const previousFaq = previousFaqId ? await this.faqDetails.findOne({ where: { id: previousFaqId } }) : null;

        // If previousFaqId is null, move the FAQ to the first position globally
        if (!previousFaq) {
            await this.faqDetails.createQueryBuilder()
                .update()
                .set({ globalOrder: () => '"globalOrder" + 1' })
                .execute();
            faqToUpdate.globalOrder = 1;
        } else {
            // Get the order of the previous FAQ
            const previousOrder = previousFaq.globalOrder || 0;
            // Increment the order of all FAQs that come after the previous FAQ
            await this.faqDetails.createQueryBuilder()
                .update()
                .set({ globalOrder: () => '"globalOrder" + 1' })
                .where('"globalOrder" >= :order', { order: previousOrder })
                .execute();
            // Set the order of the FAQ being updated to come after the previous FAQ
            faqToUpdate.globalOrder = previousOrder + 1;
        }
        const orderUpdate = await this.faqDetails.save(faqToUpdate);

        const allFaqs = await this.faqDetails.find();
        allFaqs.sort((a, b) => a.globalOrder - b.globalOrder);
        for (let i = 0; i < allFaqs.length; i++) {
            const faq = allFaqs[i];
            faq.globalOrder = i + 1;
            await this.faqDetails.save(faq);
        }

        return orderUpdate;

    }



    async listFAQs(keyword: string, category: string, faq_status: string, show_in_home: boolean, skip: number, take: number): Promise<any> {
        const queryBuilder = this.faqDetails.createQueryBuilder('faq');
        queryBuilder.leftJoinAndSelect('faq.category', 'category')
            .where('faq.faq_status != :status', { status: "Deleted" });

        let showInHomeCount;

        const totalCount = category
            ? queryBuilder.clone().andWhere('category.value = :category', { category }).getCount()
            : queryBuilder.clone().getCount();


        showInHomeCount = queryBuilder.clone().andWhere('faq.show_in_home = true').getCount();

        if (faq_status) {
            queryBuilder.andWhere('faq.faq_status = :faq_status', { faq_status });
        }
        if (keyword) {
            queryBuilder.andWhere(
                `(LOWER(faq.question) LIKE :keyword OR LOWER(faq.answer) LIKE :keyword)`,
                { keyword: `%${keyword.toLowerCase()}%` },
            );
        }

        if (show_in_home) {
            queryBuilder.andWhere('faq.show_in_home = :show_in_home', { show_in_home });
        }
        if (category) {
            queryBuilder.andWhere('category.value = :category', { category })
            const [FAQs] = await Promise.all([
                queryBuilder.orderBy({ 'faq.categoryOrder': 'ASC' }).skip(skip).take(take).getMany(),

            ]);

            return { FAQs, totalCount, showInHomeCount };
        }
        else {
            const [FAQs] = await Promise.all([
                queryBuilder.orderBy({ 'faq.globalOrder': 'ASC' }).skip(skip).take(take).getMany(),
            ]);
            return { FAQs, totalCount, showInHomeCount };
        }
    }

    async getFAQbyId(id: string) {
        const result = await this.faqDetails.findOne({
            where: { id: id },
            relations: ['category'],
        });
        if (!result) {
            // Handle the case where no data is found for the given id
            throw new Error(`FAQ with id ${id} not found`);
        }

        return result;
    }

    async updateFAQ(updateFaqInput: UpdateFaQInput) {
         this.logger.log(
            `FAQ update initiated with payload:  (${JSON.stringify(updateFaqInput)})`,
        );
        const faq = await this.faqDetails.findOne({ where: { id: updateFaqInput.id }, relations: ['category'] });
        if (!faq) {
            throw new Error(`FAQ does not exist.`);
        }
        const updatedFaq = { ...faq, ...updateFaqInput };
        updatedFaq.question = updateFaqInput.question || faq.question;
        updatedFaq.answer = updateFaqInput.answer || faq.answer;
        updatedFaq.faq_status = updateFaqInput.faq_status || faq.faq_status;
        updatedFaq.show_in_home = updateFaqInput.show_in_home ?? faq.show_in_home;
        // updateFaqInput.show_in_home || faq.show_in_home;
        if (updateFaqInput.categoryId != undefined) {
            if (faq.category?.id !== updateFaqInput.categoryId) {
                // Category changed, update category order
                const newCategory = await this.masterDetails.findOne({ where: { id: updateFaqInput.categoryId } });
                if (!newCategory) {
                    throw new Error(`new FAQ Category does not exist.`);
                }
                updatedFaq.category = newCategory;
                updatedFaq.categoryOrder = await this.getMaxCategoryOrder(updateFaqInput.categoryId) + 1;
                // updatedFaq.globalOrder = null;
            }
        }
        return await this.faqDetails.save(updatedFaq);
    }

}
